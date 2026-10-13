# QuickCart — Food & Grocery Quick-Commerce Platform

A full-stack starter project for the Low-Level Design (LLD) and High-Level Design (HLD) challenge.

## Features
- Product search and category filtering
- Nearby store inventory lookup (demo store/location)
- Shopping cart with quantity updates
- Place order with stock validation
- Delivery status tracking
- FastAPI backend with MongoDB support and in-memory fallback
- REST API documentation and Mermaid architecture/sequence diagrams
- Optional Redis caching and RabbitMQ architecture extension points

> This repository is a runnable educational MVP, not a production-ready distributed system. Payment processing, authentication, real geolocation, and live delivery integrations are intentionally not implemented.

## Tech stack
- Frontend: React + Vite + plain CSS
- Backend: Python + FastAPI
- Database: MongoDB (optional; in-memory demo mode works without it)
- Optional architecture extensions: Redis and RabbitMQ

## Quick start

### 1. Backend
Python 3.10+ recommended.

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Backend: http://127.0.0.1:8000  
Swagger API docs: http://127.0.0.1:8000/docs

The app runs with in-memory demo data by default. To use MongoDB, set `MONGODB_URI` and `MONGODB_DB` in `backend/.env`.

### 2. Frontend
Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

Vite proxies `/api` requests to the backend on port 8000.

## Main REST APIs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/products` | List products |
| GET | `/api/products/search?q=milk` | Search products |
| GET | `/api/inventory/nearby?storeId=STORE001` | Nearby/demo store inventory |
| GET | `/api/cart/{user_id}` | Get cart |
| POST | `/api/cart/items` | Add item to cart |
| PATCH | `/api/cart/items/{product_id}` | Update cart quantity |
| DELETE | `/api/cart/items/{product_id}` | Remove cart item |
| POST | `/api/orders` | Place order and reserve stock |
| GET | `/api/orders/{order_id}` | Get order |
| GET | `/api/orders/{order_id}/delivery-status` | Get delivery status |

Example add-to-cart request:

```json
{
  "userId": "U101",
  "productId": "P201",
  "quantity": 2
}
```

Example place-order request:

```json
{
  "userId": "U101",
  "storeId": "STORE001"
}
```

## Repository structure

```text
quick-commerce-platform/
├── frontend/                 # React UI
├── backend/                  # FastAPI REST APIs
├── docs/
│   ├── HLD.md
│   ├── LLD.md
│   └── diagrams/
├── .gitignore
└── README.md
```

## GitHub upload

1. Extract this ZIP.
2. Open the extracted `quick-commerce-platform` folder in VS Code.
3. Initialise and push the repository:

```bash
git init
git add .
git commit -m "Initial QuickCart implementation"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/quick-commerce-platform.git
git push -u origin main
```

Create an empty GitHub repository first and replace `YOUR_USERNAME` with your GitHub username.

## Important notes
- Never commit real `.env` files, API keys, database passwords, or credentials.
- `backend/.env.example` is safe to commit.
- The demo inventory is in-memory when MongoDB is not configured; restarting the backend resets demo order/cart state.
- Read `docs/HLD.md` and `docs/LLD.md` for design details.
