const mongoose = require('mongoose');

/**
 * Connect to the test MongoDB instance.
 * Uses MONGO_URI from environment, falling back to a local test database.
 */
async function connectDB() {
    const uri = process.env.MONGO_URI_TEST || process.env.MONGO_URI || 'mongodb://localhost:27017/4fun-test';
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(uri);
    }
}

/**
 * Close the MongoDB connection after tests finish.
 */
async function closeDB() {
    await mongoose.connection.close();
}

module.exports = { connectDB, closeDB };
