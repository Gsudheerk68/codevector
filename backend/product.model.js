const mongoose = require("mongoose");

// This defines the shape of each product document in MongoDB
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
  },
  {
    // Mongoose automatically adds createdAt and updatedAt fields
    timestamps: true,
  }
);

// ─── WHY THIS INDEX? ───────────────────────────────────────────────────────────
// We always sort by createdAt (newest first) and then by _id as a tiebreaker.
// Without an index MongoDB would scan all 200,000 documents on every request.
// With this compound index it jumps straight to the right place — very fast.
productSchema.index({ createdAt: -1, _id: -1 });

// Also index category so filtering by category is fast
productSchema.index({ category: 1, createdAt: -1, _id: -1 });

module.exports = mongoose.model("Product", productSchema);
