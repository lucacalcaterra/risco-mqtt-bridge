/* eslint linebreak-style: ["error", "windows"] */

exports.Conn = {
  // Login Data... TYPE THIS AT YOUR OWN RISK!
  loginData: {
    username: '', // your Risco Panel username
    password: '', // your Risco Panel password
    code: '', // your Risco Panel code
    SelectedSiteId: '', // SiteId Code - get it from installer or read README
  },
  RISCOHOST: 'https://www.riscocloud.com/',
  ENDPOINT: 'ELAS/WebUI/',
  ResURLs: {
    LOGIN: '',
    SITELOGIN: 'SiteLogin',
    GETCAMS: 'Cameras/Get',
    GETDECTS: 'Detectors/Get',
    GETEH: 'EventHistory/Get',
    GETOV: 'Overview/Get',
    GETCPSTATE: 'Security/GetCPState',
    SETARMDISARM: 'Security/ArmDisarm',
    SETDETBYPASS: 'Detectors/SetBypass',
    ISUSERCODEEXPIRED: 'SystemSettings/IsUserCodeExpired',
  },
  ResCODES: {
    RESP200: 200,
    RESP302: 302,
  },
  postRequestOptions: {
    referer: 'MainPage/MainPage',
  },
  POLLINGINTERVAL: 5000,
  CYCLEBEFOREUSERALIVE: 30,
  USERISALIVE: '?userIsAlive=true',
};

exports.States = {
  armStatus: {
    ARMED: 'armed',
    PARTARMED: 'partarmed',
    DISARMED: 'disarmed',
  },
  armCommands: {
    ARM: 'armed',
    DISARM: 'disarmed',
    PARTARM: 'partially',
  },
};

exports.Mqtt = {
  url: {
    MQTT_SERVER: '127.0.0.1', // your Mqtt Server address
    MQTT_PORT: 1883, // Mqtt default port
  },
  options: {
    username: '', // Mqtt Server username (if required)
    password: '', // Mqtt Server password (if required)
  },
  msgOptions: {
    clientId: 'mqttjs_Risco',
    retain: true,

  },
  channels: {
    MAINCHAN: 'riscotestLC', // Main Topic
    ARMSTATUS: 'armstatus', // Arm status subtopic
    DETECTORS: 'dects', // Detectors subtopic
    EVENTHISTORY: 'eventhistory', // Event History subtopic
    ISONALARM: 'isonalarm', // Topic for publish ongoing alarm
  },
};
