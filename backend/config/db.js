const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connUri = process.env.MONGODB_URI;
    if (connUri) {
      const conn = await mongoose.connect(connUri);
      console.log(`[MongoDB] Connected to external database: ${conn.connection.host}`);
      return;
    }
  } catch (err) {
    console.warn('[MongoDB] Connection to process.env.MONGODB_URI failed. Falling back to MongoMemoryServer...');
  }

  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    console.log(`[MongoDB] Connected to In-Memory Database at ${uri}`);
  } catch (memErr) {
    console.error('[MongoDB] In-memory database initialization failed:', memErr.message);
  }
};

module.exports = connectDB;
