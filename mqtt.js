/* eslint-disable linebreak-style */
const HomieDevice = require('homie-device');

const config = {
  name: 'Risco Panel',
  device_id: 'risco-panel',
  mqtt: {
    host: 'localhost',
    port: 1883,
    base_topic: 'homie/',
    auth: false,
    username: 'user',
    password: 'pass',
  },
  settings: {
    percentage: 55,
    $state: 'ready',
  },
};

const myDevice = new HomieDevice(config);
const myNode = myDevice.node('riscoalarm', 'node-panel');
myNode.advertise('my-property-1');
myDevice.setup();

myNode.setProperty('my-property-1').send('property-value');
