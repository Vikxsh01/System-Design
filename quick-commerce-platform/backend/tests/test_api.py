from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_products():
    response = client.get("/api/products")
    assert response.status_code == 200
    assert response.json()["count"] >= 1


def test_search():
    response = client.get("/api/products/search", params={"q": "milk"})
    assert response.status_code == 200
    assert any("milk" in item["name"].lower() for item in response.json()["items"])


def test_add_cart_and_place_order():
    # Use a unique user to avoid state collisions.
    user_id = "TEST-USER-001"
    add = client.post("/api/cart/items", json={
        "userId": user_id, "productId": "P201", "quantity": 1
    })
    assert add.status_code == 200
    order = client.post("/api/orders", json={"userId": user_id, "storeId": "STORE001"})
    assert order.status_code == 201
    assert order.json()["status"] == "CONFIRMED"
