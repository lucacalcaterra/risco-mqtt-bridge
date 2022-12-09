/* eslint linebreak-style: ["error", "windows"] */
const MQTT = require('async-mqtt');
// only for healthcheck
const express = require('express');
const RiscoPoller = require('./panelPoller');
const Config = require('./config/config');
const riscoLogger = require('./logger');

const riscoPoller = new RiscoPoller(Config.Conn.POLLINGINTERVAL);

async function main() {
  // express server only for healthcheck
  const app = express();

  app.get('/', (req, res) => {
    res.sendStatus(200);
  });

  app.listen(3000, () => {
    riscoLogger.log('info', 'Express server started...');
  });

  // init Mqtt Connection
  const mqttClient = await MQTT.connect((`tcp://${Config.Mqtt.url.MQTT_SERVER}:${Config.Mqtt.url.MQTT_PORT}`), Config.Mqtt.options);
  mqttClient.on('error', (err) => {
    riscoLogger.log('error', `error! Cannot connect to MQTT Server: ${err}`);
    riscoPoller.stop();
  });
  mqttClient.on('offline', () => {
    riscoLogger.log('error', 'error! Cannot connect to MQTT Server... Server is offline... stopping poll...');
    riscoPoller.stop();
  });
  // on Connection do stuff...
  mqttClient.on('connect', async () => {
    riscoLogger.log('info', 'Connected to MQTT Server');
    // Init connection to Risco Cloud
    await riscoPoller.init();
    // start Poller
    await riscoPoller.start();
    // Subscribe for listening commands ( MQTT IN )
    mqttClient.subscribe(`${Config.Mqtt.channels.MAINCHAN}/${Config.Mqtt.channels.ARMSTATUS}/SET`);
    mqttClient.subscribe(`${Config.Mqtt.channels.MAINCHAN}/${Config.Mqtt.channels.DETECTORS}/+/SET`);
  });

  riscoPoller.on('polled', () => {
    riscoLogger.log('debug', `Polled...counter:  ${riscoPoller.counter}`);
  });

  riscoPoller.on('newpanelstatus', async () => {
    riscoLogger.log('debug', 'newarmstatus emitted');
    if (riscoPoller.riscoConn.riscoArmStatus !== null) {
      riscoLogger.log('info', `Arming status: ${riscoPoller.riscoConn.riscoArmStatus}`);
      // publish arm status
      mqttClient.publish(`${Config.Mqtt.channels.MAINCHAN}/${Config.Mqtt.channels.ARMSTATUS}`, Config.Mqtt.transforms.states[riscoPoller.riscoConn.riscoArmStatus], Config.Mqtt.msgOptions);

      // publish isonAlarm (in case of alarm...)
      mqttClient.publish(`${Config.Mqtt.channels.MAINCHAN}/${Config.Mqtt.channels.ISONALARM}`, riscoPoller.riscoConn.riscoOngoingAlarm.toString(), Config.Mqtt.msgOptions);
      // publish detectors
      const detectorsArray = riscoPoller.riscoConn.riscoDetectors.parts[0].detectors;
      const mqttDectsTopic = `${Config.Mqtt.channels.MAINCHAN}/${Config.Mqtt.channels.DETECTORS}`;
      // publish total numbers of detectors
      mqttClient.publish(`${mqttDectsTopic}/count`, detectorsArray.length.toString(), Config.Mqtt.msgOptions);
      detectorsArray.forEach((element) => {
        const mqttMsg = JSON.stringify(element);
        mqttClient.publish(`${mqttDectsTopic}/${element.id}`, mqttMsg, Config.Mqtt.msgOptions);
        // publish sensor state
        let sensState = 'active';
        if (element.filter !== '') sensState = element.filter;
        mqttClient.publish(`${mqttDectsTopic}/${element.id}/status`, sensState, Config.Mqtt.msgOptions);
      });
      // publish Event history (json as getted from Risco Cloud)
      // All
      mqttClient.publish(`${Config.Mqtt.channels.MAINCHAN}/${Config.Mqtt.channels.EVENTHISTORY}`, JSON.stringify(riscoPoller.riscoConn.riscoEventHistory), Config.Mqtt.msgOptions);
      // Today
      //   ..... sometimes is empty , check
      if (riscoPoller.riscoConn.riscoEventHistory[0].LogRecords) {
        const todayEventsArray = riscoPoller.riscoConn.riscoEventHistory[0].LogRecords;
        // Today Not Errors Events
        const todayNotErrEventsArray = todayEventsArray.filter((event) => event.Priority !== 'error');
        // Today Errors
        const todayErrorEventsArray = todayEventsArray.filter((event) => event.Priority === '');
        mqttClient.publish(`${Config.Mqtt.channels.MAINCHAN}/${Config.Mqtt.channels.EVENTHISTORY}/today/errors`, JSON.stringify(todayErrorEventsArray), Config.Mqtt.msgOptions);
        this.lastEventString = '';
        // TODO - format Log Events in tabular , for now only last event
        /*
      lastEventObj.forEach((element) => {
        this.lastEventString = `${element.YTimeToShow} - ${element.EventName}`;
      });
      */
        // Last Event (not error, useful for knows who arm/disarm)
        this.lastEventString = (`${todayNotErrEventsArray[0].YTimeToShow} ${todayNotErrEventsArray[0].EventName}`).split('&#39;').join('');
        mqttClient.publish(`${Config.Mqtt.channels.MAINCHAN}/${Config.Mqtt.channels.EVENTHISTORY}/lastevent`, String(this.lastEventString), Config.Mqtt.msgOptions);
      }
      riscoLogger.log('info', 'publish messages on MQTT Server');
    } else riscoLogger.log('debug', 'no new status');
  });

  // Check MQTT in ... translate message to commands
  mqttClient.on('message', (topic, message) => {
    const regexdect = new RegExp(`${Config.Mqtt.channels.MAINCHAN}/${Config.Mqtt.channels.DETECTORS}/[^/]+/SET`);
    riscoLogger.log('info', `message from mqtt arrived:${topic}/${message}`);
    /**
     * CASES
     */
    switch (topic) {
      // Case of Arm Command
      case (`${Config.Mqtt.channels.MAINCHAN}/${Config.Mqtt.channels.ARMSTATUS}/SET`):
        riscoLogger.log('info', 'arm/disarm command arrived');
        switch (message.toString()) {
          case (Config.States.armCommands.ARM):
            riscoPoller.riscoConn.setArm(Config.States.armCommands.ARM);
            break;
          case (Config.States.armCommands.DISARM):
            riscoPoller.riscoConn.setArm(Config.States.armCommands.DISARM);
            break;
          case (Config.States.armCommands.PARTARM):
            riscoPoller.riscoConn.setArm(Config.States.armCommands.PARTARM);
            break;
          default:
            riscoLogger.log('warn', 'arm command not recognized');
        }
        break;
      // Case of detector command enable/disable
      case (topic.match(regexdect)[0]):
        if ((message.toString() === 'bypass') || (message.toString() === 'unbypass')) {
          riscoLogger.log('info', 'enable/disable detector command arrived...sending command to panel');
          riscoPoller.riscoConn.setDetectorBypass(topic.split('/')[2], message.toString());
        } else riscoLogger.log('warn', 'command enable/disable detector malformed');
        break;
      default:
        riscoLogger.log('warn', '...command not recognized');
    }
  });

  process.on('SIGINT', () => {
    riscoLogger.log('info', 'Exiting ... ');
    riscoPoller.stop();
    mqttClient.end();
    process.exit();
  });
}

main();
