# Product Browser

Browse 200,000 products with **fast, stable cursor-based pagination**.

## Project Structure

```
product-browser/
├── backend/
│   ├── server.js          ← Express API server
│   └── product.model.js   ← MongoDB schema + indexes
├── scripts/
│   └── seed.js            ← Generates 200,000 products (bulk insert)
├── frontend/
│   └── index.html         ← Simple browser UI
├── .env.example           ← Copy this to .env and fill in your MongoDB URI
└── README.md
```

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure MongoDB Atlas
- Create a free cluster at https://cloud.mongodb.com
- Get your connection string
- Copy `.env.example` to `.env` and paste your URI:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/productdb
PORT=3000
```

### 3. Seed the database (run once)
```bash
npm run seed
```
This inserts 200,000 products in ~30 seconds using bulk inserts.

### 4. Start the server
```bash
npm start
```

### 5. Open the UI
Open `frontend/index.html` in your browser.

---

## Key Concepts (for your examiner)

### Why cursor-based pagination?

**Problem with `skip()` (offset pagination):**
```
Page 1 → skip(0),   limit(20)
Page 2 → skip(20),  limit(20)
Page 3 → skip(200), limit(20)  ← MongoDB scans 200 docs just to skip them!
```
Two problems:
1. **Slow** — at 200,000 records, skip(190000) is very slow
2. **Unstable** — if 10 new products are added, page 2 shifts and you see duplicates

**Solution — Cursor pagination:**
Instead of "skip N items", we say "give me items OLDER than this specific item".
```
Page 1: no cursor → fetch 20 newest products
Page 2: cursor = last item from page 1 → fetch 20 items OLDER than that
Page 3: cursor = last item from page 2 → and so on...
```
New products added at the top **never affect your position** in the list.

### Why compound indexes?

```js
productSchema.index({ createdAt: -1, _id: -1 });
```
Without this index, every query scans all 200,000 documents.
With this index, MongoDB jumps directly to the right place — like a book index.

### Why bulk insert for seeding?

```
Bad:  200,000 × product.save()     = 200,000 DB calls (~10 minutes)
Good: 40 × insertMany(5,000 docs)  = 40 DB calls    (~30 seconds)
```

### API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/products` | Paginated products list |
| `GET /api/products?category=Electronics` | Filter by category |
| `GET /api/products?lastId=X&lastCreatedAt=Y` | Next page (cursor) |
| `GET /api/categories` | List of all categories |
| `GET /api/stats` | Total product count |
