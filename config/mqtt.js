module.exports = {
  brokerUrl: 'mqtt://192.168.1.102:1883',
  options: { username: 'admin', password: 'admin' },
  topics: {
    sensor: 'home/pi/sensor',
    device: 'home/pi/device'
  }
};
