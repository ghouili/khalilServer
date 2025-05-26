require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const mqtt = require('mqtt');

const UserRourtes = require("./routes/user");

const port = process.env.PORT || 3000;

const server = express();

server.use(cors());

server.use(express.json());

server.use("/uploads/images", express.static(path.join("uploads", "images")));

server.use("/user", UserRourtes);

server.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: "File upload error: " + error.message,
    });
  }

  res.status(500).json({
    success: false,
    data: "here",
    message: error.message || "Something went wrong",
  });
});

mongoose
  .connect(
    process.env.MongoDB_Key
  )
  .then((res) =>
    server.listen(port, () => {
      console.log(`server is running successfully on port ${port}`);
    })
  )
  .catch((err) => console.log(err));
