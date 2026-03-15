// cloudinaryConfig.js
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: "rentopediamern",
  api_key: "396717192926532",
  api_secret: "OmYWCEGwnav6YiSJN_RzrhA2aAM",
});

module.exports = cloudinary;
