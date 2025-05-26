// server.js
require("dotenv").config();
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const mqtt = require("mqtt");
const socketIo = require("socket.io");

// Import your existing routes
const UserRoutes = require("./routes/user");
const SensorRoutes = require("./routes/sensor");       // New: REST endpoint for latest sensor
const sensorCtrl = require("./controllers/sensor");

const {
    brokerUrl,
    options: mqttOptions,
    topics
} = require("./config/mqtt");  // { brokerUrl, options, topics: { sensor: 'home/pi/sensor' } }

const PORT = process.env.PORT || 4000;
const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use("/uploads/images", express.static(path.join(__dirname, "uploads", "images")));

// ─── REST Routes ─────────────────────────────────────────────────────────────
app.use("/user", UserRoutes);
app.use("/sensor", SensorRoutes);  // GET /sensor/latest

// ─── Error Handler ───────────────────────────────────────────────────────────
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            message: "File upload error: " + error.message,
        });
    }
    res.status(500).json({
        success: false,
        data: null,
        message: error.message || "Something went wrong",
    });
});

// ─── MongoDB + Server Startup ─────────────────────────────────────────────────
mongoose
    .connect(process.env.MongoDB_Key)
    .then(() => {
        server.listen(PORT, () => {
            console.log(`✅ HTTP & WS server running on port ${PORT}`);
        });

        // ─── MQTT Client ───────────────────────────────────────────────────────
        const mqttClient = mqtt.connect(brokerUrl, mqttOptions);

        mqttClient.on("connect", () => {
            console.log("✅ MQTT connected, subscribing to sensor topic");
            mqttClient.subscribe(topics.sensor, { qos: 1 }, (err, granted) => {
                if (err) {
                    console.error("❌ MQTT subscribe error:", err);
                } else {
                    console.log("🔖 Subscribed to:", granted.map(g => g.topic).join(", "));
                }
            });
        });

        mqttClient.on("message", async (topic, message) => {
            if (topic === topics.sensor) {
                try {
                    const payload = JSON.parse(message.toString());
                    console.log("📥 MQTT message:", payload);

                    // 1️⃣ Save to MongoDB
                    await sensorCtrl.saveReading(payload);

                    // 2️⃣ Broadcast over WebSocket
                    io.emit("sensor:update", payload);
                    console.log("🔊 Emitted sensor:update");
                } catch (err) {
                    console.error("❌ Error handling MQTT message:", err);
                }
            }
        });

    })
    .catch(err => {
        console.error("❌ MongoDB connection error:", err);
    });
