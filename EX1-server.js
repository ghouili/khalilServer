// subscriber.js
const express = require('express');
const socketIo = require('socket.io');

const client = require('./common/client');
const { topics } = require('./config/mqtt');



const app = express();
let lastMessage = null;
const TOPIC = 'home/pi/topic';
client.on('connect', () => {
    console.log('✅ MQTT connected, subscribing to topic...');

    client.subscribe([topics.sensor], { qos: 1 }, (err, granted) => {
        if (err) { console.error('Subscribe error:', err); } else {
            console.log('Subscribed to:', granted.map(g => g.topic).join(', '));

        }
    });
});

client.on('message', (topic, message) => {
    lastMessage = message.toString();
    console.log(`📥 Received on ${topic}: ${lastMessage}`);
});

app.get('/latest', (req, res) => {
    if (lastMessage === null) {
        return res.send('No messages received yet');
    }
    res.json({ topic: topics.sensor, message: lastMessage });
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 Subscriber Express listening on port ${PORT}`);
});
