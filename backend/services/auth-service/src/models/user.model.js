const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    mobile: { type: String, required: true, unique: true, index: true },
    email: { type: String },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['ADMIN', 'OPERATOR', 'USER'],
      default: 'USER',
      index: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
