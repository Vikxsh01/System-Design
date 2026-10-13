# Low-Level Design (LLD)

## 1. Scope
The MVP supports product search, nearby/demo inventory lookup, cart management, order placement, stock reservation, and delivery status tracking.

## 2. REST API specification

| Method | URI | Purpose | Success |
|---|---|---|---|
| GET | `/api/health` | API health | 200 |
| GET | `/api/products` | List products; optional `category` | 200 |
| GET | `/api/products/search?q=milk` | Search products | 200 |
| GET | `/api/inventory/nearby?storeId=STORE001` | View demo store stock | 200 |
| GET | `/api/cart/{user_id}` | Retrieve cart | 200 |
| POST | `/api/cart/items` | Add item to cart | 200 |
| PATCH | `/api/cart/items/{product_id}` | Set item quantity; zero removes | 200 |
| DELETE | `/api/cart/items/{product_id}?userId=U101` | Remove item | 200 |
| POST | `/api/orders` | Place order | 201 |
| GET | `/api/orders/{order_id}` | Retrieve order | 200 |
| GET | `/api/orders/{order_id}/delivery-status` | Track delivery | 200 |
| PATCH | `/api/orders/{order_id}/delivery-status?status=DELIVERED` | Demo status update | 200 |

### Add-to-cart request
```json
{
  "userId": "U101",
  "productId": "P201",
  "quantity": 2
}
```

Successful response:
```json
{
  "message": "Product added to cart",
  "cartId": "CART-U101",
  "items": [
    {
      "productId": "P201",
      "name": "Fresh Milk",
      "price": 50,
      "quantity": 2,
      "emoji": "🥛",
      "lineTotal": 100
    }
  ],
  "total": 100
}
```

### Place-order request
```json
{
  "userId": "U101",
  "storeId": "STORE001"
}
```

A successful request returns HTTP 201 with an order ID, items, total, order status, delivery status and creation time.

## 3. Status codes
- `200 OK`: successful read/update/cart operation.
- `201 Created`: order created.
- `400 Bad Request`: invalid input or empty cart.
- `404 Not Found`: product or order not found.
- `409 Conflict`: requested stock is unavailable.
- `422 Unprocessable Entity`: Pydantic request validation failed.
- `500 Internal Server Error`: unexpected server failure.

## 4. Domain models
- **Product:** id, name, category, price, unit, stock, emoji, description.
- **Cart:** userId, productId, quantity.
- **Order:** orderId, userId, storeId, items, total, status, deliveryStatus, deliveryPartner, estimatedMinutes, createdAt.
- **Inventory:** storeId, productId, availableQuantity.

## 5. Sequence
1. User searches for a product.
2. Product Service returns matching products.
3. User checks nearby inventory.
4. User adds products to cart.
5. Order Service validates cart and stock.
6. Stock is reserved and order is created.
7. Delivery is assigned and status is exposed to the user.

See `diagrams/order-sequence.mmd`.

## 6. Validation and design notes
- Request bodies use Pydantic validation.
- Quantity must be positive when adding an item.
- Unknown products and orders return 404.
- Stock conflicts return 409.
- Production systems should authenticate users and derive user IDs from trusted auth tokens.
- Production stock reservation must be atomic and transactional. This educational in-memory MVP does a validation pass before decrementing stock but is not safe for concurrent production traffic.
