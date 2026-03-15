const express = require("express");
const Property = require("../models/Property");
const User = require("../models/User");
const verifyToken = require("../middleware/authMiddleware"); // import JWT middleware
const optionalAuth = require("../middleware/optionalAuth");
const router = express.Router();
const multer = require("multer");
// 📌 GET all properties (public)
router.get("/all", async (req, res) => {
  try {
    const properties = await Property.find();
    
    res.json(properties);
  } catch (err) {
    console.error("Error in /property/all:", err.message, err.stack);
    res
      .status(500)
      .json({ message: "Failed to fetch properties", error: err.message });
  }
});

// 📌 GET property by ID (public)
// routes/propertyRoutes.js
// routes/propertyRoutes.js
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id; // 👈 JWT se niklega (agar user logged in hai)
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    // Agar user logged in hai aur pehle nahi dekha
    if (userId && !property.viewedBy.includes(userId)) {
      property.viewsCount += 1;
      property.viewedBy.push(userId);
      await property.save();
    }

    res.json(property);
  } catch (err) {
    console.error("Fetch Property Error:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch property", error: err.message });
  }
});

// POST /api/property/:id/review
router.post("/:id/review", verifyToken, async (req, res) => {
  try {
    const { rating, comment, username } = req.body;
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: "Not found" });

    property.reviews.push({
      userId: req.user.id,
      username,
      rating,
      comment,
    });

    await property.save();
    res.json(property);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// Memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/add", verifyToken, upload.array("images"), async (req, res) => {
  
  try {
    const { title, price, category, subCategory, description, location, deposit, rentType, condition } = req.body;
    const ownerUserID = req.user.username;
    
    const imageUrls = [];
    for (const file of req.files) {
      const url = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "properties" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result.secure_url);
          }
        );
        stream.end(file.buffer);
      });
      imageUrls.push(url);
    }

    
    const newProperty = new Property({
      title,
      price,
      category,
      subCategory,
      description,
      location,
      images: imageUrls,
      deposit,
      rentType,
      condition,
      ownerUserID,
      status: "available",
    });

    await newProperty.save();
    res.status(201).json(newProperty);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});



// 📌 GET properties by owner (protected — must match logged-in user)
router.get("/owner/:username", verifyToken, async (req, res) => {
  if (req.params.username !== req.user.username) {
    return res
      .status(403)
      .json({ message: "Not authorized to view these properties" });
  }

  const properties = await Property.find({ ownerUserID: req.user.username });

  res.json(properties);
});

// POST rent request
router.post("/:id/rent-request", verifyToken, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property)
      return res.status(404).json({ message: "Property not found" });

    const { days, totalAmount } = req.body;
    if (!days || days < 1)
      return res.status(400).json({ message: "Invalid days" });

    const rentRequest = {
      requester: req.user.username,
      days,
      totalAmount,
      status: "pending", // pending / accepted / rejected
      createdAt: new Date(),
    };

    property.rentRequests = property.rentRequests || [];
    property.rentRequests.push(rentRequest);
    await property.save();

  

    res.json({ message: "Rent request sent!", rentRequest });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to send rent request", error: err.message });
  }
});

// PATCH /api/property/:propertyId/rent-request/:requestId
// Accept a rent request
router.post("/:id/rent-request/:reqId/accept", verifyToken, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: "Property not found" });

    // Only owner can accept
    if (property.ownerUserID !== req.user.username)
      return res.status(403).json({ message: "Not authorized" });

    const request = property.rentRequests.id(req.params.reqId);
    if (!request) return res.status(404).json({ message: "Rent request not found" });

    request.status = "accepted";
    property.status = "not available"; // mark property unavailable
    await property.save();

    

    res.json({ message: "Request accepted", request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to accept request", error: err.message });
  }
});

// Reject a rent request
router.post("/:id/rent-request/:reqId/reject", verifyToken, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: "Property not found" });

    // Only owner can reject
    if (property.ownerUserID !== req.user.username)
      return res.status(403).json({ message: "Not authorized" });

    const request = property.rentRequests.id(req.params.reqId);
    if (!request) return res.status(404).json({ message: "Rent request not found" });

    request.status = "rejected";
    
    // check if any accepted request exists
    const accepted = property.rentRequests.some(r => r.status === "accepted");
    property.status = accepted ? "not available" : "available";

    await property.save();


    res.json({ message: "Request rejected", request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to reject request", error: err.message });
  }
});

// List rent requests sent by current user
router.get("/rent-requests/sent", verifyToken, async (req, res) => {
  try {
    const username = req.user.username;
    const properties = await Property.find({ "rentRequests.requester": username });

    const results = [];
    for (const property of properties) {
      for (const request of property.rentRequests || []) {
        if (request.requester === username) {
          results.push({
            propertyId: property._id,
            propertyTitle: property.title,
            ownerUsername: property.ownerUserID,
            requestId: request._id,
            days: request.days,
            totalAmount: request.totalAmount,
            status: request.status,
            createdAt: request.createdAt,
          });
        }
      }
    }
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to list sent requests", error: err.message });
  }
});

// List rent requests received by current user (as owner)
router.get("/rent-requests/received", verifyToken, async (req, res) => {
  try {
    const username = req.user.username;
    const properties = await Property.find({ ownerUserID: username, rentRequests: { $exists: true, $ne: [] } });

    const results = [];
    for (const property of properties) {
      for (const request of property.rentRequests || []) {
        results.push({
          propertyId: property._id,
          propertyTitle: property.title,
          requester: request.requester,
          requestId: request._id,
          days: request.days,
          totalAmount: request.totalAmount,
          status: request.status,
          createdAt: request.createdAt,
        });
      }
    }
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to list received requests", error: err.message });
  }
});

// Cancel rent request by requester (only pending)
router.post("/:id/rent-request/:reqId/cancel", verifyToken, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: "Property not found" });

    const request = property.rentRequests.id(req.params.reqId);
    if (!request) return res.status(404).json({ message: "Rent request not found" });

    if (request.requester !== req.user.username) {
      return res.status(403).json({ message: "Not authorized to cancel this request" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ message: "Only pending requests can be cancelled" });
    }

    request.status = "cancelled";

    const hasAccepted = property.rentRequests.some(r => r.status === "accepted");
    property.status = hasAccepted ? "not available" : "available";

    await property.save();

    res.json({ message: "Request cancelled", request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to cancel request", error: err.message });
  }
});


module.exports = router;
