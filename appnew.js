/* eslint linebreak-style: ["error", "windows"] */

/** Risco MQTT Bridge
 * @author Luca Calcaterra <calcaterra.luca@gmail.com>
 * @version 1.5 Beta
 */

const MqttHABridge = require('./mqttHABridge');
const logger = require('./logger');
const Config = require('./config/config');

const bridgeMQTT = new MqttHABridge(Config.Conn.POLLINGINTERVAL, {
  host: Config.Mqtt.url.MQTT_SERVER,
  port: Config.Mqtt.url.MQTT_PORT,
  options: Config.Mqtt.options
});

process.on('SIGINT', async () => {
  logger.log('info', 'Exiting ... ');
  await bridgeMQTT.stop();
  process.exit();
});
