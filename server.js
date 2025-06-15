require("dotenv").config();
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const mqtt = require("mqtt");
const socketIo = require("socket.io");

// Import routes and models
const UserRoutes = require("./routes/user");
const SensorRoutes = require("./routes/sensor");
const sensorCtrl = require("./controllers/sensor");
const Action = require("./models/action"); // New: Action model

const {
    brokerUrl,
    options: mqttOptions,
    topics,
    topicss
} = require("./config/mqtt");

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
app.use("/sensor", SensorRoutes);

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
        // const mqttClient = mqtt.connect(brokerUrl, mqttOptions);
        const mqttClient = mqtt.connect(brokerUrl);

        mqttClient.on("connect", () => {
            console.log("✅ MQTT connected, subscribing to sensor topic");
            mqttClient.subscribe(topicss, { qos: 1 }, (err, granted) => {
                if (err) {
                    console.error("❌ MQTT subscribe error:", err);
                } else {
                    console.log("🔖 Subscribed to:", granted.map(g => g.topic).join(", "));
                }
            });
        });

        mqttClient.on("message", async (topic, message) => {
            if (topic === topics.dht22 ||
                topic === topics.mq2 || topic === topics.motion) {
                try {
                    const payload = JSON.parse(message.toString());
                    console.log("📥 MQTT message:", payload);
                    await sensorCtrl.saveReading(payload);
                    io.emit("sensor:update", payload);
                    console.log("🔊 Emitted sensor:update");
                } catch (err) {
                    console.error("❌ Error handling MQTT message:", err);
                }
            }
        });

        // ─── Socket.IO for Control Commands ────────────────────────────────────
        io.on("connection", (socket) => {
            console.log("Client connected:", socket.id);

            // Fan control (A/C)
            socket.on("control/fan/speed", async (data) => {
                const { userId, componentId, speed } = data;
                console.log(`Fan ${componentId} speed set to ${speed}% by ${userId}`);
                const action = new Action({
                    componentId, // e.g., "ac_kitchen"
                    action: "set_speed",
                    value: speed.toString(),
                    userId,
                    state: `on at ${speed}%`
                });
                await action.save();
                mqttClient.publish("control/fan/speed", speed.toString());
                console.log(`Fan ${componentId} speed set to ${speed}% by ${userId}`);
            });

            // Stepper control (Shutters)
            socket.on("control/stepper/step", async (data) => {
                const { userId, componentId, steps } = data;
                console.log(`Shutter ${componentId} moved ${steps} steps by ${userId}`);
                const action = new Action({
                    componentId, // e.g., "shutter_living_room"
                    action: steps > 0 ? "open" : "close",
                    value: Math.abs(steps).toString(),
                    userId,
                    state: `moved ${steps} steps`
                });
                await action.save();
                mqttClient.publish("control/stepper/step", steps.toString());
                console.log(`Shutter ${componentId} moved ${steps} steps by ${userId}`);
            });

            // socket.on("control/stepper/position", async (data) => {
            //     const { userId, componentId, position } = data;
            //     const action = new Action({
            //         componentId,
            //         actionB: "set_position",
            //         value: position.toString(),
            //         userId,
            //         state: `${position}% open`
            //     });
            //     await action.save();
            //     // Assuming the Raspberry Pi can handle position commands; adjust topic if needed
            //     mqttClient.publish("control/stepper/step", position.toString());
            //     console.log(`Shutter ${componentId} set to ${position}% by ${userId}`);
            // });

            // Lamp control (Lights)
            socket.on("control/lamp/state", async (data) => {
                const { userId, componentId, state } = data;
                const action = new Action({
                    componentId, // e.g., "light_bedroom"
                    action: state === "on" ? "on" : "off",
                    userId,
                    state: state
                });
                await action.save();
                mqttClient.publish("control/lamp/state", state);
                console.log(`Lamp ${componentId} turned ${state} by ${userId}`);
            });

            // LED control (Lights brightness)
            socket.on("control/led/brightness", async (data) => {
                const { userId, componentId, brightness } = data;
                console.log(`LED ${componentId} brightness set to ${brightness}% by ${userId}`);
                const action = new Action({
                    componentId, // e.g., "light_bedroom"
                    action: "set_brightness",
                    value: brightness.toString(),
                    userId,
                    state: `on at ${brightness}%`
                });
                await action.save();
                mqttClient.publish("control/led/brightness", brightness.toString());
                console.log(`LED ${componentId} brightness set to ${brightness}% by ${userId}`);
            });

            socket.emit("notification", "Motion detected!");

            // Simulate periodic notifications (e.g., every 10 seconds)
            const interval = setInterval(() => {
                // socket.emit("notification", `Motion detected at ${new Date().toLocaleTimeString()}`);
                // socket.emit("security:motion", { message: `Some movement detected in the Test Room` });
                // socket.emit("security:gas", { message: `Gas alarm is ${gasAlarmStatus ? "active" : "inactive"}` });
            }, 10000);


            socket.on("disconnect", () => {
                console.log("Client disconnected:", socket.id);
            });
        });

    })
    .catch(err => {
        console.error("❌ MongoDB connection error:", err);
    });