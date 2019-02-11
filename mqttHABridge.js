/* eslint-disable class-methods-use-this */
/* eslint linebreak-style: ["error", "windows"] */
const mqtt = require('mqtt');
const RiscoPoller = require('./panelPoller');
const logger = require('./logger');
const config = require('./config/config');

module.exports = class HAMqttBridge extends RiscoPoller {
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
      await this.init();
      await this.start();

      // ************* when connected publish messages from panel
      this.on('polled', () => {});
      // when new panel status arrives
      this.on('newpanelstatus', () => {
        this.mqttClient.publish('homeassistant/alarm_control_panel/home/status', 'disarmed');
      });
    });
    // on error
    this.mqttClient.on('error', err => {
      logger.log('error', `error! Cannot connect to MQTT Server: ${err}`);
    });
  }
};
