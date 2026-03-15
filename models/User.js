const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    lowercase: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },

  profileImage: {
    data: Buffer, // binary content
    contentType: String // e.g. 'image/jpeg'
  }

}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
