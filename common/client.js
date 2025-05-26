const mqtt = require('mqtt');
const { brokerUrl, options } = require('../config/mqtt');
module.exports = mqtt.connect(brokerUrl, options);
