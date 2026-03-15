const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key_here";

function optionalAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    return next();
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch (err) {
    // ignore invalid token for public routes
  }
  next();
}

module.exports = optionalAuth;


