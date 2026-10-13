import os
from datetime import datetime, timezone
from uuid import uuid4
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from pymongo import MongoClient
from pymongo.errors import PyMongoError

router = APIRouter()

SEED_PRODUCTS = [
    {"id": "P201", "name": "Fresh Milk", "category": "Dairy", "price": 50, "unit": "1 litre", "stock": 35, "emoji": "🥛", "description": "Fresh everyday dairy"},
    {"id": "P202", "name": "Brown Bread", "category": "Bakery", "price": 40, "unit": "400 g", "stock": 22, "emoji": "🍞", "description": "Soft whole-wheat bread"},
    {"id": "P203", "name": "Bananas", "category": "Fruits", "price": 60, "unit": "6 pieces", "stock": 40, "emoji": "🍌", "description": "Naturally sweet bananas"},
    {"id": "P204", "name": "Tomatoes", "category": "Vegetables", "price": 35, "unit": "500 g", "stock": 28, "emoji": "🍅", "description": "Farm-fresh tomatoes"},
    {"id": "P205", "name": "Eggs", "category": "Dairy", "price": 72, "unit": "6 pieces", "stock": 18, "emoji": "🥚", "description": "Farm eggs"},
    {"id": "P206", "name": "Potato Chips", "category": "Snacks", "price": 20, "unit": "1 pack", "stock": 50, "emoji": "🥔", "description": "Crunchy salted snack"},
    {"id": "P207", "name": "Apples", "category": "Fruits", "price": 120, "unit": "500 g", "stock": 16, "emoji": "🍎", "description": "Crisp red apples"},
    {"id": "P208", "name": "Orange Juice", "category": "Beverages", "price": 85, "unit": "1 litre", "stock": 12, "emoji": "🧃", "description": "Refreshing fruit juice"},
    {"id": "P209", "name": "Rice", "category": "Staples", "price": 65, "unit": "1 kg", "stock": 30, "emoji": "🍚", "description": "Everyday cooking rice"},
    {"id": "P210", "name": "Spinach", "category": "Vegetables", "price": 25, "unit": "1 bunch", "stock": 14, "emoji": "🥬", "description": "Fresh leafy greens"},
]

products = {p["id"]: p.copy() for p in SEED_PRODUCTS}
carts: dict[str, dict[str, int]] = {}
orders: dict[str, dict] = {}
mongo_db = None

uri = os.getenv("MONGODB_URI", "").strip()
if uri:
    try:
        client = MongoClient(uri, serverSelectionTimeoutMS=1500)
        client.admin.command("ping")
        mongo_db = client[os.getenv("MONGODB_DB", "quickcart")]
    except Exception:
        mongo_db = None


class AddCartItem(BaseModel):
    userId: str = Field(min_length=1, max_length=100)
    productId: str = Field(min_length=1, max_length=100)
    quantity: int = Field(gt=0, le=99)


class UpdateCartItem(BaseModel):
    userId: str = Field(min_length=1, max_length=100)
    quantity: int = Field(ge=0, le=99)


class PlaceOrder(BaseModel):
    userId: str = Field(min_length=1, max_length=100)
    storeId: str = "STORE001"


def get_cart_items(user_id: str):
    user_cart = carts.get(user_id, {})
    items = []
    for product_id, quantity in user_cart.items():
        product = products.get(product_id)
        if product:
            items.append({
                "productId": product_id,
                "name": product["name"],
                "price": product["price"],
                "quantity": quantity,
                "emoji": product["emoji"],
                "lineTotal": product["price"] * quantity,
            })
    return items


@router.get("/health")
def health():
    return {"status": "ok", "database": "mongodb" if mongo_db is not None else "in-memory-demo"}


@router.get("/products")
def list_products(category: Optional[str] = None):
    result = list(products.values())
    if category and category.lower() != "all":
        result = [p for p in result if p["category"].lower() == category.lower()]
    return {"items": result, "count": len(result)}


@router.get("/products/search")
def search_products(q: str = Query(default="", max_length=100), category: Optional[str] = None):
    query = q.strip().lower()
    result = [
        p for p in products.values()
        if query in p["name"].lower() or query in p["category"].lower()
    ]
    if category and category.lower() != "all":
        result = [p for p in result if p["category"].lower() == category.lower()]
    return {"items": result, "count": len(result), "query": q}


@router.get("/inventory/nearby")
def nearby_inventory(
    storeId: str = Query(default="STORE001"),
    lat: Optional[float] = None,
    lon: Optional[float] = None,
):
    return {
        "storeId": storeId,
        "storeName": "QuickCart Local Store",
        "distanceKm": 1.2,
        "location": {"lat": lat, "lon": lon} if lat is not None and lon is not None else None,
        "items": [
            {"productId": p["id"], "name": p["name"], "availableQuantity": p["stock"], "inStock": p["stock"] > 0}
            for p in products.values()
        ],
        "note": "Demo store inventory; live geolocation is not connected."
    }


@router.get("/cart/{user_id}")
def get_cart(user_id: str):
    items = get_cart_items(user_id)
    return {"userId": user_id, "items": items, "total": sum(i["lineTotal"] for i in items)}


@router.post("/cart/items")
def add_cart_item(body: AddCartItem):
    product = products.get(body.productId)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if body.quantity > product["stock"]:
        raise HTTPException(status_code=409, detail="Insufficient stock")
    cart = carts.setdefault(body.userId, {})
    new_quantity = cart.get(body.productId, 0) + body.quantity
    if new_quantity > product["stock"]:
        raise HTTPException(status_code=409, detail="Requested cart quantity exceeds available stock")
    cart[body.productId] = new_quantity
    items = get_cart_items(body.userId)
    return {
        "message": "Product added to cart",
        "cartId": f"CART-{body.userId}",
        "items": items,
        "total": sum(i["lineTotal"] for i in items),
    }


@router.patch("/cart/items/{product_id}")
def update_cart_item(product_id: str, body: UpdateCartItem):
    if product_id not in products:
        raise HTTPException(status_code=404, detail="Product not found")
    cart = carts.setdefault(body.userId, {})
    if body.quantity == 0:
        cart.pop(product_id, None)
    else:
        if body.quantity > products[product_id]["stock"]:
            raise HTTPException(status_code=409, detail="Insufficient stock")
        cart[product_id] = body.quantity
    items = get_cart_items(body.userId)
    return {"items": items, "total": sum(i["lineTotal"] for i in items)}


@router.delete("/cart/items/{product_id}")
def remove_cart_item(product_id: str, userId: str = Query(...)):
    carts.setdefault(userId, {}).pop(product_id, None)
    items = get_cart_items(userId)
    return {"message": "Item removed", "items": items, "total": sum(i["lineTotal"] for i in items)}


@router.post("/orders", status_code=201)
def place_order(body: PlaceOrder):
    cart = carts.get(body.userId, {})
    if not cart:
        raise HTTPException(status_code=400, detail="Cart is empty")
    for product_id, quantity in cart.items():
        product = products.get(product_id)
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
        if product["stock"] < quantity:
            raise HTTPException(status_code=409, detail=f"Insufficient stock for {product['name']}")
    # Demo in-memory reservation. A production implementation needs atomic DB transactions.
    items = get_cart_items(body.userId)
    total = sum(i["lineTotal"] for i in items)
    for product_id, quantity in cart.items():
        products[product_id]["stock"] -= quantity
    order_id = "ORD-" + uuid4().hex[:8].upper()
    order = {
        "orderId": order_id,
        "userId": body.userId,
        "storeId": body.storeId,
        "items": items,
        "total": total,
        "status": "CONFIRMED",
        "deliveryStatus": "PREPARING",
        "deliveryPartner": None,
        "estimatedMinutes": 20,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    orders[order_id] = order
    carts[body.userId] = {}
    return {"message": "Order placed successfully", **order}


@router.get("/orders/{order_id}")
def get_order(order_id: str):
    order = orders.get(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.get("/orders/{order_id}/delivery-status")
def delivery_status(order_id: str):
    order = orders.get(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return {
        "orderId": order_id,
        "status": order["deliveryStatus"],
        "deliveryPartner": order["deliveryPartner"],
        "estimatedMinutes": order["estimatedMinutes"],
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }


@router.patch("/orders/{order_id}/delivery-status")
def update_delivery_status(order_id: str, status: str = Query(...)):
    allowed = {"PREPARING", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"}
    if status not in allowed:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {', '.join(sorted(allowed))}")
    order = orders.get(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order["deliveryStatus"] = status
    if status in {"PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"}:
        order["deliveryPartner"] = order["deliveryPartner"] or "DP-DEMO-01"
    if status == "DELIVERED":
        order["estimatedMinutes"] = 0
    return {"message": "Delivery status updated", "orderId": order_id, "status": status}
