const mongoose = require("mongoose");

const RentRequestSchema = new mongoose.Schema({
  requester: { type: String, required: true }, // username of requester
  days: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ["pending", "accepted", "rejected", "cancelled"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

const PropertySchema = new mongoose.Schema({
  title: { type: String, required: true },
  price: { type: Number, required: true },
  deposit: { type: Number, required: true },
  category: String,
  subCategory: String,
  description: String,
  location: String,
  images: [String],
  rentType: String,
  condition: String,
  ownerUserID: String,
  status: { type: String, default: "available" },
  viewsCount: { type: Number, default: 0 },
  viewedBy: [String],
  reviews: [
    {
      userId: String,
      username: String,
      rating: Number,
      comment: String,
    },
  ],
  rentRequests: [RentRequestSchema], // ✅ add this line
});

module.exports = mongoose.model("Property", PropertySchema);
