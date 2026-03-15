const mongoose = require("mongoose");

const DeletedUserSchema = new mongoose.Schema(
  {
    originalUserId: { type: mongoose.Schema.Types.ObjectId, required: true },
    username: { type: String, required: true },
    email: { type: String, required: true },
    name: { type: String },
    profileImage: {
      data: Buffer,
      contentType: String,
    },
    reason: { type: String, default: "user_requested" },
    metadata: { type: Object },
    deletedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DeletedUser", DeletedUserSchema);


