const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// JWT secret key (should be in .env)
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key_here";

// 👉 REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, username, email, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Registration failed", error: err.message });
  }
});

// 👉 LOGIN
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Send token as httpOnly cookie
    // match cookie lifetime with JWT expiration
    res.cookie("token", token, {
      httpOnly: true,
      secure: true, 
      sameSite: "none", //"none"  using different ports,
      path:"/",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 day
    }); 
    res.json({ message: "Login successful" });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

// 👉 LOGOUT
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none"
  });
  res.json({ message: "Logged out successfully" });
});


module.exports = router;
