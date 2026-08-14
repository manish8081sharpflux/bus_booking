const mongoose = require('mongoose');
const { MONGO_URI } = require('../../config/env');

async function connectMongo() {
  if (!MONGO_URI) throw new Error('MONGO_URI is required');
  await mongoose.connect(MONGO_URI);
  console.log('[consumers] MongoDB connected');
}

module.exports = connectMongo;
