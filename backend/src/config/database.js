const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/linkstream';

const connectDB = async (retries = process.env.NODE_ENV === 'test' ? 1 : 5, delay = 1000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 2000,
        socketTimeoutMS: 45000,
      });
      console.log(`[MongoDB] Connected to ${MONGODB_URI}`);
      return;
    } catch (err) {
      if (process.env.NODE_ENV === 'test') {
        throw err;
      }
      console.error(`[MongoDB] Connection attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt < retries) {
        console.log(`[MongoDB] Retrying in ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        console.error('[MongoDB] All connection attempts failed. Exiting.');
        process.exit(1);
      }
    }
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Disconnected. Mongoose will auto-reconnect.');
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Error:', err.message);
});

module.exports = { connectDB, mongoose };
