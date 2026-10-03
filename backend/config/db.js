const mongoose = require('mongoose');

const connectDB = async () => {
  const connUri = process.env.MONGODB_URI;
  if (!connUri || !connUri.trim()) {
    console.warn('[MongoDB] MONGODB_URI not set. Application will run using in-memory state manager.');
    return;
  }

  try {
    const conn = await mongoose.connect(connUri.trim(), {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[MongoDB] Connected successfully to database: ${conn.connection.host}`);
  } catch (err) {
    console.warn(`[MongoDB] Connection to process.env.MONGODB_URI failed (${err.message}). Application will run using in-memory state manager.`);
  }
};

module.exports = connectDB;
