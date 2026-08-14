const mongoose = require('mongoose');

const tripViewSchema = new mongoose.Schema(
  {
    tripId: { type: String, index: true, required: true, unique: true },
    source: String,
    destination: String,
    departureTime: Date,
    availableSeats: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('TripView', tripViewSchema);
