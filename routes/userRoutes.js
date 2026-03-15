const express = require("express");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const verifyToken = require("../middleware/authMiddleware"); // JWT middleware
const router = express.Router();
const bcrypt = require("bcryptjs");
const Property = require("../models/Property");
const multer = require("multer");
const DeletedUser = require("../models/DeletedUser");

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.put(
  "/upload-profile",
  verifyToken, // make sure user is logged in
  upload.single("profileImage"),
  async (req, res) => {
    try {
      const userId = req.user.id; // from verifyToken middleware
      if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          profileImage: {
            data: req.file.buffer,
            contentType: req.file.mimetype,
          },
        },
        { new: true }
      ).select("-password"); // do not send password

      res.json({ message: "Profile photo updated!", user: updatedUser });
    } catch (err) {
      console.error("Profile Upload Error:", err);
      res.status(500).json({ message: "Failed to upload profile photo" });
    }
  }
);

// 🟪 Get logged-in user's details (secure)
router.get("/me", verifyToken, async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

// GET /user/:id
router.get("/:username", verifyToken, async (req, res) => {
  try {
    const user = await User.find({ username: req.params.username }).select(
      "-password"
    );

    if (!user) return res.status(404).json({ msg: "User not found" });

    const products = await Property.find({ ownerUserID: req.params.username });

    res.json({ user, products });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// 🟪 Get user by username (duplicate route — consider removing if not needed)
router.get("/username/:username", verifyToken, async (req, res) => {
  if (req.params.username !== req.user.username) {
    return res
      .status(403)
      .json({ message: "Not authorized to view this user" });
  }

  const user = await User.findOne({ username: req.params.username }).select(
    "-password"
  );
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

router.get("/verify", (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: "No token found" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ message: "Token is valid", user: decoded });
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
});

router.put("/change-password", verifyToken, async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }
    console.log(isMatch);

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    // console.log(isMatch,hashedPassword);

    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating password", error: err.message });
  }
});

// 🗑️ Delete my account → archive + delete properties + delete user
router.delete("/delete", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Archive user
    await DeletedUser.create({
      originalUserId: user._id,
      username: user.username,
      email: user.email,
      name: user.name,
      profileImage: user.profileImage,
      reason: "user_requested",
    });

    // Delete properties posted by this user
    await Property.deleteMany({ ownerUserID: user.username });

    // Delete the user account
    await User.deleteOne({ _id: user._id });

    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    res.json({ message: "Account deleted and archived successfully" });
  } catch (err) {
    console.error("Delete account error:", err);
    res.status(500).json({ message: "Failed to delete account", error: err.message });
  }
});

module.exports = router;
