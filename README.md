
# Risco (or MyElas) Panel <-> MQTT - bridge 
Bridge Risco-MyElas Alarm panel to and from MQTT Server (to interface a home automation controller)



[![NPM](https://nodei.co/npm/risco-mqtt-bridge.png)](https://nodei.co/npm/risco-mqtt-bridge/)

**2019-02-12 UPDATE: With  Beta 2.0 release supports Home Assistant Autodiscovery, so can discovery panel and Detectors without manual edit the config. Try it and let me know. Thanks**

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

*To get your riscoSiteId, login to riscocloud via ChromeBrowser (first login screen), and before providing your PIN (second login page), display source of the page and find string: `<div class="site-name" ` ... it will look like:

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

You can receive arming status subscribing to `riscopanel/armstatus/{PartitionId}` topic.

For backward compatibility topic `riscopanel/armstatus` is still supported which returns arming status for partition 0.

### Detectors data (triggered, bypassed/unbypassed and others)

Receive detectors data subscribing to `riscopanel/dects/{PartitionId}/{DetectorIndex}`. Please note that `DetectorIndex`
is an array index within particular partition, it is not the same as `DetectorId` which is a panel's internal designation
(and which is unique across all partitions).

### Event History data

Can receive Event History of your security panel subscribing to `riscopanel/eventhistory` for all events data (JSON format), or
`riscopanel/eventhistory/lastevent` to retrieve last event
`riscopanel/eventhistory/today/errors` to retrieve today's errors events 
(other possibilities must to be implemented)

### Ongoing Alarm

Subscribing to `riscopanel/isonalarm` can receive messages if your panel is in alarm state (`true` if is on alarm / `false` not in alarm)
### Arm/Disarm  

You can send the following messages to `riscopanel/armstatus/{PartitionId}/SET` topic:

* `armed` to arm partition
* `diarmed` to disarm partition
* `partarmed` to partially arm partition

(commands can be changed to the section `armStatus` in `exports.States`).

For backward compatibility topic `riscopanel/armstatus/SET` is still supported which controls partition 0.

### Bypass/Unbypass detectors

You can send the following messages to `riscopanel/dects/{DetectorId}/SET` topic:

* `bypass` for bypass specific detector ({DetectorId})
* `unbypass` for unbypass specific detector ({DetectorId})

Please note that `{DetectorId}` is a panel's internal designation of detector (specified in the detector's JSON status)
which is unique across all partitions (it is not the same as `{DetectorIndex}`).

# Home Assistant

To make the bridge work with Home Assistant you must enable MQTT and use the MQTT Alarm Control Panel of HA  (https://www.home-assistant.io/components/alarm_control_panel.mqtt/).

 ## Configuration
 Change `config.js` in transforms section as follow:

```javascript

transforms: {
    // transforms states strings...to use for example in Home Assistant to reflect H.A.'s  alarm control panel states
    states: {
      disarmed: 'disarmed', 
      partarmed: 'armed_home', 
      armed: 'armed_away', 
      onalarm: 'onalarm', 
    },
 ```   
  ....  

Add following lines to `configuration.yaml` in HomeAssistant :
```yaml
......
mqtt:
  broker: 127.0.0.1

alarm_control_panel:
  - platform: mqtt
    state_topic: "riscopanel/armstatus"
    command_topic: "riscopanel/armstatus/SET"
    payload_disarm: "disarmed" 
    payload_arm_home: "partially"
    payload_arm_away: "armed"
......
```
## Run with Docker

You can run it with Docker, without having to install nodes and all of its dependencies. 
Cannot explain how Docker works in this README but if you know it a little, i  give you some short examples...
REQUIREMENTS: MQTT Server (You can run also mqtt server with docker in case you don't have it on your host).
If you want can build the Docker image with Dockerfile provided in the repo.

#### Example running MQTT Server and Risco-Mqtt-Bridge with docker
- 1- Run MQTT container (i.e. Mosquitto container- refer to: https://hub.docker.com/_/eclipse-mosquitto)
- 2- Copy config.js from the github project, fill your params and run risco-mqtt-bridge container with :
`docker run --name risco-mqtt-bridge -v {path where copied}/config.js:/app/config/config.js lucacalcaterra/risco-mqtt-bridge`
You can also mount the logs dir if you want adding the param `-v {your path}/logs:/app/logs`

BONUS: I created the docker image for ARM also (for running i.e on Raspberry); to use it must append armhf tag when pull image: `lucacalcaterra/risco-mqtt-bridge:armhf`

#### Example running MQTT Server and Risco-Mqtt-Bridge with Docker Compose
If you know Docker Compose here is an example of a *docker-compose.yml* file:

***docker-compose.yml***:

```yaml
version: '2.0'
services:
  mosquitto:
    image: eclipse-mosquitto
    container_name: mosquitto
    restart: unless-stopped
    ports:
      - "1883:1883"
      - "9001:9001"
    #volumes:
    # - ./mosquitto/config:/mosquitto/config
    # - ./mosquitto/data:/mosquitto/data - /srv/dockerct/mosquitto/log:/mosquitto/log
  risco-mqtt-bridge:
    image: lucacalcaterra/risco-mqtt-bridge # Append 'armhf' if you run it on ARM Platform
    container_name: risco-mqtt-bridge
    restart: unless-stopped
    #ports: - "3000"
    volumes:
      - ./config.js:/app/config/config.js
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production


```
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
