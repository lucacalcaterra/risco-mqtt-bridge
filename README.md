# Risco (or MyElas) Panel <-> MQTT - bridge 
Bridge Risco-MyElas Alarm panel to and from MQTT Server (to interface a home automation controller)

## Motivation
This application is useful for interfacing a home automation controller that support MQTT protocol (for example Openhab, Home Assistant, etc... ) with Cloud Risco (or MyElas, depending on your country).

It can receive information from the Cloud Risco and send it to an MQTT server, or then receive commands via MQTT messages to be sent to the Cloud Risco(for example to arm or disarm your system).

**ATTENTION**: using this application you do it at your own risk, this is not an official Risco application. If you have access to the cloud installers area, I recommend you create another user and panel security code.
However it is highly recommended not to share your cloud data (username, password, security code or site Id) on the internet, nor with other users.

## Requirements

* [Node.js](https://nodejs.org) (currently tested with >=ver. 8.x)
* Mqtt Server - e.g. [Mosquitto](http://www.mosquitto.org), [HiveMQ](https://www.hivemq.com/), etc.
* An home automation controller like [Openhab](https://www.openhab.org/), [Home Assistant](https://www.home-assistant.io) or others (probably the reason why you're here :blush: )

## Installation

After installing Node.js, execute the following steps: 
* clone the repository with `git clone https://github.com/lucacalcaterra/risco-mqtt-bridge.git `
* `cd risco-mqtt-bridge`
* `npm install`
* in config dir copy the `config-example.js` to `config.js ` and fill your information (follow the Configuration section below)
* launch with `node app.js`

if you want, you can use a process manager like pm2, nodemon,  forever for automatically restart or launch at system boot the app.

## Configuration

In `config.js` inside config folder, the mandatory parameters to be filled are:

Inside `loginData` section:
* `username` : your cloud username
* `password` : your cloud password
* `code` : your cloud security code (for its username)
* `SelectedSiteId` : your riscoSiteId *

Inside `exports.Mqtt` section fill `MQTT_SERVER` address (change port also, if different from the standard 1883 ); if MQTT server requires authentication fill `username` and `password` in `options `

If you want, you can change the MQTT topics where the messages are published inside `channels` section (in the lines there are brief descriptive comments
)

* To get your riscoSiteId, login to riscocloud via ChromeBrowser (first login screen), and before providing your PIN (second login page), display source of the page and find string: `<div class="site-name" ` ... it will look like:

`<div class="site-name" id="site_12345_div">`
In that case "12345" is your siteId 
(Thanks to [szlaskidaniel in homebridge-risco-alarm project ](https://github.com/szlaskidaniel/homebridge-risco-alarm) for this description)

To change polling interval (I suggest not to lower it too much, avoiding overloading of Risco servers) can change `POLLINGINTERVAL` param (in milliseconds)

Leave the other parameters as they are (if you do not know what you are doing)

## Receive Informations and Send commands from/to Risco Cloud (and so ... to your alarm panel)
You can receive informations and send commands from your alarm system subscribing/publishing related topics. 

Here is a simple example with following configuration topics (default topic and subtopics as in default-config.js):
```javascript
channels: {
    MAINCHAN: 'riscopanel', // Main Topic
    ARMSTATUS: 'armstatus', // Arm status subtopic
    DETECTORS: 'dects', // Detectors subtopic
    EVENTHISTORY: 'eventhistory', // Event History subtopic
    ISONALARM: 'isonalarm', // Topic for receiving ongoing alarm
  },
  ```

### Arming status

You can receive arming status subscribing to `riscopanel/armstatus` topic

### Detectors data (triggered, bypassed/unbypassed and others)

Receive detectors data subscribing to `riscopanel/dects` for JSON data of all detectors or `riscopanel/dects/15` for receive only data about detector with id 15 (example)

### Event History data

Can receive Event History of your security panel subscribing to `riscopanel/eventhistory` for all events data (JSON format), or
`riscopanel/eventhistory/lastevent` to retrieve last event
`riscopanel/eventhistory/today/errors` to retrieve today's errors events 
(other possibilities must to be implemented)

### Ongoing Alarm

Subscribing to `riscopanel/isonalarm` can receive messages if your panel is in alarm state (`true` if is on alarm / `false` not in alarm)
### Arm/Disarm  

You can send the following messages to `riscopanel/armstatus/SET` topic:

* `armed` to arm partition
* `diarmed` to disarm partition
* `partarmed` to partially arm partition

(commands can be changed to the section `armStatus` in `exports.States`)

### Bypass/Unbypass detectors

You can send the following messages to `riscopanel/dects/{DetectorId}/SET` topic:

* `bypass` for bypass specific detector ({DetectorId})
* `unbypass` for unbypass specific detector ({DetectorId})

## ISSUES/KNOWN BUGS/SUGGESTIONS

For now , it works only with one partition and does not manage groups

I'm using the application with my alarm system (using Openhab mqtt binding for receive arm status), please send me your feedbacks (opening ticket on issues in github page), so i can fix any issues.

Report them to: https://github.com/lucacalcaterra/risco-mqtt-bridge/issues
## Tech/framework used

* [Node.js](https://nodejs.org)
* [MQTT](http://mqtt.org/) (for example Mosquitto)
* [Axios](https://github.com/axios/axios) for http requests
* [MQTT.js](https://github.com/mqttjs) for publish/subscribe MQTT messages
* [Winston](https://github.com/winstonjs/winston) for logging
* [config](https://www.npmjs.com/package/config) for the Application config 



[![Support via PayPal](https://cdn.rawgit.com/twolfson/paypal-github-button/1.0.0/dist/button.svg)](https://www.paypal.me/lucacalcaterra/)
