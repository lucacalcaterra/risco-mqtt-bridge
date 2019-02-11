/* eslint-disable class-methods-use-this */
/* eslint linebreak-style: ["error", "windows"] */
const mqtt = require('mqtt');
const PanelPoller = require('./panelPoller');
const logger = require('./logger');
const config = require('./config/config');

const BASE_PREFIX = 'homeassistant';
const HA_MQTT_COMPONENT = 'alarm_control_panel';
const GROUP_ID = 'risco';
const NODE_ID = 'alarmpanel';
const STATE_TOPIC = `${BASE_PREFIX}/${HA_MQTT_COMPONENT}/${GROUP_ID}/${NODE_ID}`;
const COMMAND_TOPIC = `${STATE_TOPIC}/set`;
const AVAILABILITY_TOPIC = `${STATE_TOPIC}/available`;

const MQTT_PANEL_CONFIG = {
  CONFIG_TOPIC: `${STATE_TOPIC}/config`,
  // Config Message for Autodiscovery
  CONFIG_MSG: {
    name: NODE_ID,
    unique_id: NODE_ID,
    state_topic: STATE_TOPIC,
    command_topic: COMMAND_TOPIC,
    availability_topic: AVAILABILITY_TOPIC,
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
    this.mqttClient = mqtt.connect(this.mqttConn);
    // on connect
    this.mqttClient.on('connect', async () => {
      logger.log('info', 'Connected to MQTT Server');
      // subscribe to topics
      this.mqttClient.subscribe(`${STATE_TOPIC}/set`);
      try {
        if (await this.init()) {
          this.mqttClient.publish(AVAILABILITY_TOPIC, 'online', MQTT_PANEL_CONFIG.MSG_OPTIONS);
          await this.start();
        } else
          this.mqttClient.publish(AVAILABILITY_TOPIC, 'offline', MQTT_PANEL_CONFIG.MSG_OPTIONS);
      } catch (error) {
        this.mqttClient.publish(AVAILABILITY_TOPIC, 'offline', MQTT_PANEL_CONFIG.MSG_OPTIONS);
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
        this.mqttClient.publish(AVAILABILITY_TOPIC, 'online', MQTT_PANEL_CONFIG.MSG_OPTIONS);
      });
      // when new panel status arrives
      this.on('newpanelstatus', () => {
        if (this.riscoConn.riscoArmStatus !== null) {
          this.mqttClient.publish(
            STATE_TOPIC,
            MQTT_PANEL_CONFIG.STATES[this.riscoConn.riscoArmStatus],
            MQTT_PANEL_CONFIG.MSG_OPTIONS
          );
        }
      });
      this.on('stopped', () => {
        this.mqttClient.publish(AVAILABILITY_TOPIC, 'offline', MQTT_PANEL_CONFIG.MSG_OPTIONS);
      });
    });

    // when new message arrives
    this.mqttClient.on('message', (topic, message) => {
      logger.log('info', `message from mqtt arrived:${topic}/${message}`);

      switch (topic) {
        case COMMAND_TOPIC:
          switch (message.toString()) {
            case MQTT_PANEL_CONFIG.ARM_COMMANDS.ARM:
              this.riscoConn.setArm('armed');
              this.mqttClient.publish(STATE_TOPIC, 'pending');
              logger.log('info', 'command arrived: ARM');
              break;
            case MQTT_PANEL_CONFIG.ARM_COMMANDS.DISARM:
              this.riscoConn.setArm('disarmed');
              this.mqttClient.publish(STATE_TOPIC, 'pending');
              logger.log('info', 'command arrived: DISARM');
              break;
            case MQTT_PANEL_CONFIG.ARM_COMMANDS.PARTARM:
              this.mqttClient.publish(STATE_TOPIC, 'pending');
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
    });

    // on error
    this.mqttClient.on('error', err => {
      logger.log('error', `error! Cannot connect to MQTT Server: ${err}`);
    });
  }
};
