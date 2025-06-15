module.exports = {
  brokerUrl: 'mqtt://192.168.1.100:1883',
  // options: { username: 'admin', password: 'admin' },
  topics: {
    fan: 'control/fan/speed',
    shutter: 'control/stepper/step',
    lamp: 'control/lamp/state',
    led: 'control/led/brightness',
    dht22: 'sensors/dht22',
    mq2: 'sensors/mq2',
    motion: 'sensors/motion'
  },
  topicss: [ 'control/fan/speed', 'control/stepper/step', 'control/lamp/state', 'control/led/brightness', 'sensors/dht22', 'sensors/dht22', 'sensors/mq2', 'sensors/motion'
  ]
};
