const Sensor = require('../models/sensorReadings');


exports.saveReading = async (data) => {
  const reading = new Sensor({
    sensorId: "DHT22",
    temperature: data.temperature,
    humidity: data.humidity,
    timestamp: data.timestamp || Date.now()
  });
  return await reading.save();
};


exports.getLatest = async () => {
  return await Sensor.findOne().sort({ timestamp: -1 });
};