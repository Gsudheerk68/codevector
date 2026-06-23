/**
 * PRODUCT BROWSER — Express + MongoDB backend
 *
 * Key concept: CURSOR-BASED PAGINATION
 * ─────────────────────────────────────
 * Traditional "offset" pagination uses skip():
 *   Page 1 → skip(0),  limit(20)
 *   Page 2 → skip(20), limit(20)
 *
 * Problems with skip():
 *   1. SLOW  — MongoDB still scans all skipped documents
 *   2. BUGGY — if a new product is added, everything shifts
 *              and you'll see duplicates or miss items
 *
 * Cursor-based pagination fixes both problems:
 *   Instead of "skip N items", we say "give me items OLDER than this one"
 *   The "cursor" is the (createdAt, _id) of the last item on the current page.
 *   New items added at the top don't affect your current position at all.
 */

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Product = require("./product.model");

const app = express();
app.use(cors({
  origin: "https://codevectorv2.netlify.app"  
}));
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });

// ─── GET /api/products (CURSOR-BASED — stable and fast) ───────────────────────
app.get("/api/products", async (req, res) => {
  try {
    const { category, lastId, lastCreatedAt } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);

    const filter = {};
    if (category && category !== "All") {
      filter.category = category;
    }

    if (lastId && lastCreatedAt) {
      const cursorDate = new Date(lastCreatedAt);
      const cursorId = new mongoose.Types.ObjectId(lastId);
      filter.$or = [
        { createdAt: { $lt: cursorDate } },
        { createdAt: cursorDate, _id: { $lt: cursorId } },
      ];
    }

    const products = await Product.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasNextPage = products.length > limit;
    if (hasNextPage) products.pop();

    let nextCursor = null;
    if (hasNextPage && products.length > 0) {
      const lastItem = products[products.length - 1];
      nextCursor = { lastId: lastItem._id, lastCreatedAt: lastItem.createdAt };
    }

    res.json({ products, nextCursor, hasNextPage, count: products.length });
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// ─── GET /api/products/offset (SKIP-BASED — broken when data changes) ─────────
// This is the BAD approach — included only to DEMONSTRATE the duplicate problem
app.get("/api/products/offset", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit; // THE PROBLEM IS HERE

    const products = await Product.find()
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({ products, page, skip, count: products.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/demo/inject ────────────────────────────────────────────────────
// Injects N new products with the NEWEST timestamps so they appear at the top.
// Call this while browsing page 2+ to see cursor pagination stay stable.
app.post("/api/demo/inject", async (req, res) => {
  try {
    const count = Math.min(parseInt(req.body.count) || 50, 200);
    const CATEGORIES = ["Electronics", "Clothing", "Books", "Home & Kitchen", "Sports"];
    const now = new Date();
    const docs = [];

    for (let i = 0; i < count; i++) {
      docs.push({
        name: `INJECTED-${i + 1} (added while you browsed)`,
        category: CATEGORIES[i % CATEGORIES.length],
        price: Math.round(Math.random() * 500 * 100) / 100,
        // Space each 1ms apart so they sort correctly among themselves
        createdAt: new Date(now.getTime() + i),
        updatedAt: now,
      });
    }

    await Product.insertMany(docs, { ordered: false });
    const total = await Product.countDocuments();

    res.json({
      message: `Injected ${count} new products at the TOP`,
      newTotal: total,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/categories ──────────────────────────────────────────────────────
app.get("/api/categories", async (req, res) => {
  try {
    const categories = await Product.distinct("category");
    categories.sort();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// ─── GET /api/stats ───────────────────────────────────────────────────────────
app.get("/api/stats", async (req, res) => {
  try {
    const total = await Product.countDocuments();
    res.json({ total });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
