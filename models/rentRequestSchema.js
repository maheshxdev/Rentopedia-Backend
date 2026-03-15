const mongoose = require("mongoose");

const rentRequestSchema = new mongoose.Schema(
  {
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    renterId: { type: String, required: true }, // username or userId
    renterName: { type: String }, // optional for easy display
    duration: { type: String, required: true },
    message: String,
    totalRent: Number,
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RentRequest", rentRequestSchema);
