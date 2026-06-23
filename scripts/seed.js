/**
 * SEED SCRIPT — generates 200,000 products in MongoDB
 *
 * HOW TO RUN:
 *   node scripts/seed.js
 *
 * WHY IS THIS FAST?
 *   Bad approach  → loop 200,000 times, each calling product.save()
 *                   = 200,000 round trips to the database (very slow ~10 min)
 *
 *   Good approach → build all documents in memory as a plain JS array,
 *                   then send them in batches of 5,000 using insertMany()
 *                   = only 40 round trips to the database (~30 seconds)
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../backend/product.model");

// The pool of categories products can belong to
const CATEGORIES = [
  "Electronics",
  "Clothing",
  "Books",
  "Home & Kitchen",
  "Sports",
  "Toys",
  "Beauty",
  "Automotive",
  "Garden",
  "Food",
];

// Some sample product name parts we combine to make varied names
const ADJECTIVES = [
  "Pro",
  "Ultra",
  "Mini",
  "Mega",
  "Smart",
  "Lite",
  "Max",
  "Plus",
  "Basic",
  "Premium",
];
const NOUNS = [
  "Gadget",
  "Widget",
  "Device",
  "Tool",
  "Kit",
  "Pack",
  "Set",
  "Bundle",
  "Unit",
  "Item",
];

// Helper: pick a random element from an array
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper: generate a random price between min and max, rounded to 2 decimals
function randomPrice(min = 5, max = 999) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

// Helper: generate a random date within the past 2 years
function randomDate() {
  const now = Date.now();
  const twoYearsAgo = now - 2 * 365 * 24 * 60 * 60 * 1000;
  return new Date(twoYearsAgo + Math.random() * (now - twoYearsAgo));
}

async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected!");

  // Clear existing products so we start fresh
  console.log("Clearing existing products...");
  await Product.deleteMany({});

  const TOTAL = 200_000; // 200,000 products
  const BATCH_SIZE = 5_000; // send 5,000 at a time to MongoDB
  const totalBatches = TOTAL / BATCH_SIZE; // = 40 batches

  console.log(
    `Inserting ${TOTAL.toLocaleString()} products in ${totalBatches} batches of ${BATCH_SIZE.toLocaleString()}...`
  );

  const startTime = Date.now();

  for (let batch = 0; batch < totalBatches; batch++) {
    // Build an array of 5,000 plain objects (not Mongoose documents)
    // This is much faster than creating 5,000 `new Product()` instances
    const docs = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
      const productNumber = batch * BATCH_SIZE + i + 1;
      const createdAt = randomDate();

      docs.push({
        name: `${pick(ADJECTIVES)} ${pick(NOUNS)} ${productNumber}`,
        category: pick(CATEGORIES),
        price: randomPrice(),
        // We set timestamps manually so dates are spread across 2 years
        // (otherwise all 200k products would have the same createdAt)
        createdAt: createdAt,
        updatedAt: createdAt,
      });
    }

    // insertMany sends all 5,000 docs in ONE database call
    // ordered: false means if one doc fails, the rest still insert
    await Product.insertMany(docs, { ordered: false });

    console.log(
      `  Batch ${batch + 1}/${totalBatches} done — ` +
        `${((batch + 1) * BATCH_SIZE).toLocaleString()} products inserted`
    );
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Done! Inserted ${TOTAL.toLocaleString()} products in ${elapsed}s`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
