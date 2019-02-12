/* eslint-disable class-methods-use-this */
/* eslint linebreak-style: ["error", "windows"] */
const mqtt = require('mqtt');
const PanelPoller = require('./panelPoller');
const logger = require('./logger');
const config = require('./config/config');

const BASE_PREFIX = 'homeassistant';
const GROUP_ID = 'risco';

// ** Panel
const HAMQTT_PANEL_COMPONENT = 'alarm_control_panel';
const NODE_PANEL_ID = 'RiscoPanel';
const STATE_PANEL_TOPIC = `${BASE_PREFIX}/${HAMQTT_PANEL_COMPONENT}/${GROUP_ID}/${NODE_PANEL_ID}`;
const COMMAND_PANEL_TOPIC = `${STATE_PANEL_TOPIC}/set`;
const AVAILABILITY_PANEL_TOPIC = `${STATE_PANEL_TOPIC}/available`;
// ** Sensors
const HAMQTT_DETECTOR_COMPONENT = 'sensor';
const NODE_DETECTOR_ID = 'RiscoDetector';
const STATE_DETECTOR_TOPIC = `${BASE_PREFIX}/${HAMQTT_DETECTOR_COMPONENT}/${GROUP_ID}/${NODE_DETECTOR_ID}`;
const MQTT_PANEL_CONFIG = {
  CONFIG_TOPIC: `${STATE_PANEL_TOPIC}/config`,
  // Config Message for Autodiscovery
  CONFIG_MSG: {
    name: `${NODE_PANEL_ID} - Partition 1`,
    unique_id: NODE_PANEL_ID,
    state_topic: STATE_PANEL_TOPIC,
    command_topic: COMMAND_PANEL_TOPIC,
    availability_topic: AVAILABILITY_PANEL_TOPIC,
    retain: 'true'
  },
  MSG_OPTIONS: {
    clientId: 'mqttjs_Risco',
    retain: true
  },
  // transforms states strings...to use for example in Home Assistant to reflect H.A.'s  alarm control panel states
  STATES: {
    disarmed: 'disarmed', // disarmed
    partarmed: 'armed_home', // If you use Home Assistant you must set to 'armed_home'
    armed: 'armed_away', // If you use  Home Assistant you must set to 'armed_away'
    onalarm: 'triggered' // If you use  Home Assistant you must set to 'triggered'
  },
  ARM_COMMANDS: {
    ARM: 'ARM_AWAY',
    DISARM: 'DISARM',
    PARTARM: 'ARM_HOME'
  }
};

module.exports = class HAMqttBridge extends PanelPoller {
  constructor(interval, mqttConn) {
    super(interval);
    this.mqttConn = mqttConn;
    this.mqttInit();
  }

  mqttInit() {
    logger.log('info', 'Waiting for connection to MQTT...');
    this.mqttClient = mqtt.connect(this.mqttConn);
    // on error
    this.mqttClient.on('error', err => {
      logger.log('error', `error! Cannot connect to MQTT Server: ${err}`);
    });
    // on connect
    this.mqttClient.on('connect', async () => {
      logger.log('info', 'Connected to MQTT Server');
      // subscribe to topics
      this.mqttClient.subscribe(`${STATE_PANEL_TOPIC}/set`);
      try {
        if (await this.init()) {
          this.mqttClient.publish(
            AVAILABILITY_PANEL_TOPIC,
            'online',
            MQTT_PANEL_CONFIG.MSG_OPTIONS
          );
          this.publishDetectors();
          await this.start();
        } else
          this.mqttClient.publish(
            AVAILABILITY_PANEL_TOPIC,
            'offline',
            MQTT_PANEL_CONFIG.MSG_OPTIONS
          );
      } catch (error) {
        this.mqttClient.publish(AVAILABILITY_PANEL_TOPIC, 'offline', MQTT_PANEL_CONFIG.MSG_OPTIONS);
        logger.log(
          'error',
          'MQTT bridge not working because the panel is offline (check init sequence)'
        );
      }
      // send a config message for autodiscovery
      this.mqttClient.publish(
        MQTT_PANEL_CONFIG.CONFIG_TOPIC,
        JSON.stringify(MQTT_PANEL_CONFIG.CONFIG_MSG),
        // MQTT_PANEL_CONFIG.MSG_OPTIONS
        {
          retain: true
        }
      );

      // ************* when connected publish messages from panel
      this.on('polled', () => {
        this.mqttClient.publish(AVAILABILITY_PANEL_TOPIC, 'online', MQTT_PANEL_CONFIG.MSG_OPTIONS);
      });
      // when new panel status arrives
      this.on('newpanelstatus', () => {
        if (this.riscoConn.riscoArmStatus !== null) {
          this.mqttClient.publish(
            STATE_PANEL_TOPIC,
            MQTT_PANEL_CONFIG.STATES[this.riscoConn.riscoArmStatus],
            MQTT_PANEL_CONFIG.MSG_OPTIONS
          );
          // call publish detectors info
          this.publishDetectors();
          // publish eventhistory
          if (this.riscoConn.riscoEventHistory !== null) {
            this.mqttClient.publish(
              `${STATE_PANEL_TOPIC}/eventhistory`,
              JSON.stringify(this.riscoConn.riscoEventHistory),
              MQTT_PANEL_CONFIG.MSG_OPTIONS
            );
          }
        }
      });
      this.on('stopped', () => {
        this.mqttClient.publish(AVAILABILITY_PANEL_TOPIC, 'offline', MQTT_PANEL_CONFIG.MSG_OPTIONS);
      });

      // when new message arrives
      this.mqttClient.on('message', (topic, message) => {
        logger.log('info', `message from mqtt arrived:${topic}/${message}`);

        switch (topic) {
          case COMMAND_PANEL_TOPIC:
            switch (message.toString()) {
              case MQTT_PANEL_CONFIG.ARM_COMMANDS.ARM:
                this.riscoConn.setArm('armed');
                this.mqttClient.publish(STATE_PANEL_TOPIC, 'pending');
                logger.log('info', 'command arrived: ARM');
                break;
              case MQTT_PANEL_CONFIG.ARM_COMMANDS.DISARM:
                this.riscoConn.setArm('disarmed');
                this.mqttClient.publish(STATE_PANEL_TOPIC, 'pending');
                logger.log('info', 'command arrived: DISARM');
                break;
              case MQTT_PANEL_CONFIG.ARM_COMMANDS.PARTARM:
                this.mqttClient.publish(STATE_PANEL_TOPIC, 'pending');
                this.riscoConn.setArm('partially');
                logger.log('info', 'command arrived: PARTARM');
                break;
              default:
                logger.log('warn', 'arm command not recognized');
            }
            break;
          default:
            logger.log('warn', '...command not recognized');
        }
      });

      this.mqttClient.on('close', () => {
        logger.log('info', 'connection to MQTT closed');
        this.stop();
      });
    });
  }

  publishDetectors() {
    const detectorsArray = this.riscoConn.riscoDetectors.parts[0].detectors;
    if (detectorsArray !== null) {
      logger.log('info', 'Publish detectors info');

      // cycle array
      detectorsArray.forEach(element => {
        const decttopic = STATE_DETECTOR_TOPIC + element.id;
        const configMsg = {
          name: `Dect-${element.name}`,
          state_topic: `${decttopic}/state`
        };
        this.mqttClient.publish(`${decttopic}/config`, JSON.stringify(configMsg), {
          retain: true
        });
        let state = false;
        if (element.filter === '') state = 'OFF';
        else if (element.filter === 'triggered') state = 'ON';
        else if (element.filter === 'bypassed') state = 'BYP';
        this.mqttClient.publish(`${decttopic}/state`, state, {
          retain: true
        });
      });
    }
  }
};