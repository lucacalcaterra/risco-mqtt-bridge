/* eslint linebreak-style: ["error", "windows"] */
const MqttHABridge = require('./mqttHABridge');
const riscoLogger = require('./logger');


const bridge = new MqttHABridge(8000, { host: 'localhost' });
