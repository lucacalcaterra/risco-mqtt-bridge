/* eslint linebreak-style: ["error", "windows"] */
/* eslint no-console: 0 */
// const Logger = require('logplease');
const EventEmitter = require('events');
const riscoLogger = require('./logger');
const RiscoConnection = require('./serverHandler.js');
const Config = require('./config/config');


module.exports = class RiscoPoller extends EventEmitter {
  constructor(interval) {
    super();
    this.counter = -1;
    this.interval = interval;
    this.pollerStop = true;
    this.timer = null;

    this.riscoConn = new RiscoConnection({
      username: Config.Conn.loginData.username,
      password: Config.Conn.loginData.password,
      pincode: Config.Conn.loginData.code,
    },
    riscoLogger);
  }

  async init() {
    await this.riscoConn.login();
    await this.riscoConn.sendSiteAndCode();
    await this.riscoConn.getCameras();
    await this.riscoConn.getEventHistory();
    await this.riscoConn.getDetectors();
    // check new panel status and emit
    await this.riscoConn.getCPState();
    this.emit('newpanelstatus');
    riscoLogger.log('debug', 'Init function for getting data from Cloud completed: OK');
  }

  async poll() {
    if (!this.pollerStop) {
      this.timer = setTimeout(async () => {
        riscoLogger.log('debug', 'polling ...');
        this.counter += 1;
        await this.riscoConn.getDetectors();
        await this.riscoConn.getCPState();
        this.emit('polled');
        // check if is logged... if not init...
        if (!this.riscoConn.isLogged) {
          riscoLogger.log('warn', 'Disconnected from cloud...relogin and init...');
          this.init();
        }

        if (this.riscoConn.riscoCPState !== null) {
          this.emit('newpanelstatus');
          riscoLogger.log('info', 'Status panel infos arrived');
        }
        if (!this.pollerStop) { await this.poll(); }
      },
      this.interval);
    }
  }


  stop() {
    this.pollerStop = true;
    clearTimeout(this.timer);
    riscoLogger.log('debug', 'polling stopped.');
  }

  async start() {
    this.pollerStop = false;
    riscoLogger.log('debug', 'polling started...');
    await this.poll();
  }
};
