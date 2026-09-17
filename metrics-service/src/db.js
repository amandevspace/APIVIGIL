const mongoose = require("mongoose");

async function connectDb() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/apivigil");
  console.log("[metrics-service] MongoDB connected");
}

module.exports = connectDb;
