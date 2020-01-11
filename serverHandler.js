/* eslint-disable max-len */
/* eslint linebreak-style: ["error", "windows"] */
/* eslint no-console: 0 */
const axios = require('axios');
const Config = require('./config/config.js');

module.exports = class RiscoConnection {
  constructor({ username, password, pincode }, logger) {
    // privates
    this.riscousername = username;
    this.riscopassword = password;
    this.riscocode = pincode;

    this.isLogged = false;
    this.codeVerified = false;
    this.riscoCookies = null;
    // various states
    this.riscoCameras = null;
    this.riscoDetectors = null;
    this.riscoEventHistory = null;
    this.riscoCPState = null;
    this.riscoArmStatus = null;
    this.riscoOngoingAlarm = false;
    this.UserCodeExpired = false;
    this.riscolastArmFailure = null;
    //
    this.riscoLogger = logger;
    this.riscoLogger.log('debug', 'Class Connection Constructor end');
  }

  async login() {
    try {
      const postData = `username=${this.riscousername}&password=${this.riscopassword}`;
      const resp = await axios({
        method: 'post',
        url: Config.Conn.RISCOHOST + Config.Conn.ENDPOINT,
        headers: {
          // not needed...
          // 'Content-Length': postData.length,
          // 'Content-type': 'application/x-www-form-urlencoded',
        },
        data: postData,

        validateStatus(status) {
          return status >= Config.Conn.ResCODES.RESP302 && status < 400; // default
        },
        maxRedirects: 0,
      });

      if (resp.status === Config.Conn.ResCODES.RESP302) {
        this.isLogged = true;
        this.riscoCookies = resp.headers['set-cookie'];
        this.riscoLogger.log('debug', 'Logged...Response code is 302: OK');
      }
    } catch (e) {
      this.riscoLogger.log('error', `Exceptions on login response: ${e}`);
    }
    return this.isLogged;
  }

  async sendSiteAndCode() {
    try {
      const postData = `SelectedSiteId=${Config.Conn.loginData.SelectedSiteId}&Pin=${this.riscocode}`;
      const resp = await axios({
        method: 'post',
        url: Config.Conn.RISCOHOST + Config.Conn.ENDPOINT + Config.Conn.ResURLs.SITELOGIN,
        headers: {
          Cookie: this.riscoCookies,
        },
        data: postData,
        validateStatus(status) {
          return status >= Config.Conn.ResCODES.RESP200 && status < 400; // default
        },
        maxRedirects: 0,
      });

      if (resp.status === Config.Conn.ResCODES.RESP302) {
        this.codeVerified = true;
        this.riscoLogger.log('debug', '...site and Pin Code sent...Response code is 302: OK');
      }
    } catch (e) {
      this.riscoLogger.log('error', `Exception after sending code: ${e}`);
    }
    return this.isLogged;
  }


  async getCameras() {
    try {
      const resp = await axios({
        method: 'post',
        url: Config.Conn.RISCOHOST + Config.Conn.ENDPOINT + Config.Conn.ResURLs.GETCAMS,
        headers: {
          Cookie: this.riscoCookies,
        },
        data: {},
      });

      if ((resp.status === Config.Conn.ResCODES.RESP200) && (resp.data.error === 0)) {
        this.riscoCameras = resp.data.cameras;
        this.riscoLogger.log('debug', '...Cameras taken...Response code is 200 and no data error: OK');
      }
    } catch (e) {
      this.riscoLogger.log('error', `Exception getting Cameras: ${e}`);
    }
    return this.riscoCameras;
  }

  async getDetectors() {
    try {
      const resp = await axios({
        method: 'post',
        url: Config.Conn.RISCOHOST + Config.Conn.ENDPOINT + Config.Conn.ResURLs.GETDECTS,
        headers: {
          Cookie: this.riscoCookies,
        },
        data: {},
      });

      if ((resp.status === Config.Conn.ResCODES.RESP200) && (resp.data.error === 0)) {
        this.riscoDetectors = resp.data.detectors;
        this.riscoArmStatus = this.getArmStatus(resp.data.detectors);
        this.riscoLogger.log('debug', '...Detectors taken...Response code is 200 and no data error: OK');
      }
    } catch (e) {
      this.riscoLogger.log('error', `Exception getting Detectors: ${e}`);
    }
    return this.riscoDetectors;
  }

  async getEventHistory() {
    try {
      const resp = await axios({
        method: 'post',
        url: Config.Conn.RISCOHOST + Config.Conn.ENDPOINT + Config.Conn.ResURLs.GETEH,
        headers: {
          Cookie: this.riscoCookies,
        },
        data: {},
      });

      if ((resp.status === Config.Conn.ResCODES.RESP200) && (resp.data.error === 0)) {
        this.riscoEventHistory = resp.data.eh;
        this.riscoLogger.log('debug', '...Event History taken...Response code is 200 and no data error: OK');
      }
    } catch (e) {
      this.riscoLogger.log('error', `Exception getting Event History: ${e}`);
    }
    return this.riscoEventHistory;
  }

  async getCPState() {
    // if (userIsAlive !== '') this.riscoLogger.log('debug', 'userisAlive sent! ...');
    try {
      const resp = await axios({
        method: 'post',
        url: Config.Conn.RISCOHOST + Config.Conn.ENDPOINT + Config.Conn.ResURLs.GETCPSTATE + Config.Conn.USERISALIVE,
        headers: {
          Cookie: this.riscoCookies,
        },
        data: {},
      });
      // check if logged out... set logged flag to false
      if (resp.data.error !== 0) {
        this.isLogged = false;
        // return;
      }
      if ((resp.status === Config.Conn.ResCODES.RESP200) && (resp.data.error === 0) && (resp.data.overview !== null)) {
        this.riscoCPState = resp.data.overview;
        this.riscoOngoingAlarm = resp.data.OngoingAlarm;
        this.riscoDetectors = resp.data.detectors;
        this.riscoLogger.log('debug', '...Control Panel State taken and overview not empty... OK');
        return this.riscoCPState;
      }
    } catch (e) {
      this.riscoLogger.log('error', `Exception getting Control Panel State: ${e}`);
    }
    this.riscoLogger.log('debug', 'return null, overview empty!');
    this.riscoCPState = null;
    return this.riscoCPState;
  }

  iconToArmStatus(icon) {
    switch (icon.substring(icon.lastIndexOf('/') + 1)) {
      case 'ico-armed.png':
        return Config.States.armStatus.ARMED;
      case 'ico-disarmed.png':
        return Config.States.armStatus.DISARMED;
      case 'ico-partial.png':
        return Config.States.armStatus.PARTARMED;
    }
  }

  getArmStatus(detectors) {
    this.riscoArmStatus = [];
    detectors.parts.forEach((part) => {
      this.riscoArmStatus[part.id] = this.iconToArmStatus(part.armIcon);
    });
    return this.riscoArmStatus;
  }

  async setArm(part, cmd) {
    // code set in case of arm/disarm
    const armcode = (cmd === Config.States.armCommands.ARM) ? '' : '------';
    const postData = `type=${part}:${cmd}&passcode=${armcode}&bypassZoneId=-1`;

    // check if user code is expired...
    await this.isUserCodeExpired();
    // ..in this case login again..
    if (this.UserCodeExpired) await this.login();
    try {
      const resp = await axios({
        method: 'post',
        url: Config.Conn.RISCOHOST + Config.Conn.ENDPOINT + Config.Conn.ResURLs.SETARMDISARM,
        headers: {
          Cookie: this.riscoCookies,
        },
        data: postData,
      });

      if (resp.data.armFailures === null) {
        this.riscolastArmFailure = 0;
        this.riscoLogger.log('debug', 'arm command result ok');
      } else {
        this.riscolastArmFailure = resp.data.armFailures;
        throw Error(resp.data.armFailures.text);
      }
    } catch (e) {
      this.riscoLogger.log('error', `Exception on arm/disarm command: ${e}`);
    }
  }

  async isUserCodeExpired() {
    try {
      const resp = await axios({
        method: 'post',
        url: Config.Conn.RISCOHOST + Config.Conn.ENDPOINT + Config.Conn.ResURLs.ISUSERCODEEXPIRED,
        headers: {
          Cookie: this.riscoCookies,
        },
        data: {},
      });

      if ((resp.data.error === 0) && (resp.data.pinExpired === false)) { this.UserCodeExpired = false; } else { this.UserCodeExpired = true; }
      this.riscoLogger.log('debug', `user code is expired? : ${this.UserCodeExpired}`);
    } catch (e) {
      this.riscoLogger.log('error', `Exception checking if user code expires ${e}`);
    }
    return this.UserCodeExpired;
  }

  async setDetectorBypass(dectId, dectBypass) {
    let by;
    if (dectBypass === 'bypass') by = true;
    else if (dectBypass === 'unbypass') by = false;
    const postData = `id=${dectId}&bypass=${by}`;

    try {
      const resp = await axios({
        method: 'post',
        url: Config.Conn.RISCOHOST + Config.Conn.ENDPOINT + Config.Conn.ResURLs.SETDETBYPASS,
        headers: {
          Cookie: this.riscoCookies,
        },
        data: postData,
      });

      if (resp.data.error === 0) { this.riscoLogger.log('info', `set detector ${dectId} to: ${dectBypass.toString()}`); } else {
        throw new Error('error on response...');
      }
    } catch (e) {
      this.riscoLogger.log('error', `Exception on detector bypass/unbypass: ${e}`);
    }
  }
};
