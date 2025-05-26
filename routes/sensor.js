const express = require('express');
const router = express.Router();
const sensorCtrl = require('../controllers/sensor');

router.get('/latest', async (req, res, next) => {
  try {
    const latest = await sensorCtrl.getLatest();
    if (!latest) {
      return res.status(404).json({ success: false, message: 'No sensor data available' });
    }
    res.json({ success: true, data: latest });
  } catch (err) {
    next(err);
  }
});

module.exports = router;