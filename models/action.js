const mongoose = require("mongoose");

const actionSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    componentId: { type: String, required: true },
    action: { type: String, required: true },
    value: { type: String }, // e.g., "50" for speed, brightness, or position
    userId: { type: String, required: true },
    state: { type: String }, // e.g., "on at 50%", "30% open"
    energyConsumption: { type: String }, // e.g., "0.5 kWh", optional
    error: { type: String } // e.g., "Error 101", optional
});

module.exports = mongoose.model("Action", actionSchema);