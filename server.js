require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");
const propertyRoutes = require("./routes/propertyRoutes");
const userRoutes = require("./routes/userRoutes");
const authMiddelware = require("./middleware/authMiddleware");

dotenv.config();
const app = express(); 

// Middleware
app.use(cookieParser());
app.use(
  cors({
    origin: ["https://rentopedia-app.vercel.app"],
    credentials: true,
  })
);

app.use(express.json());
app.use(
  session({
    secret: "rentopedia_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
    },
  })
);

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/property", propertyRoutes);
app.use("/api/user", userRoutes);

// ✅ MongoDB & Start Server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(5000, () => {
      console.log("✅ Server running on http://localhost:5000");
    });
  })
.catch(err => console.error("❌ DB connection error:", err));