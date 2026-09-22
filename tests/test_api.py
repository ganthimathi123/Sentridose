import sys
import os
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.main import app, seed_database
from app.database import engine, Base, SessionLocal

@pytest.fixture(scope="module")
def client():
    # Ensure tables and seed data are initialized
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
        
    with TestClient(app) as c:
        yield c

def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "SentriDose" in data["service"]

def test_auth_login(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@sentridose.io", "password": "admin123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "admin"

def test_unauthorized_access(client):
    response = client.get("/api/v1/dashboard/summary")
    assert response.status_code == 401

def test_dashboard_summary_with_token(client):
    # Obtain token
    auth_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@sentridose.io", "password": "admin123"}
    )
    token = auth_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/v1/dashboard/summary", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_workers" in data
    assert "system_mode" in data
    assert data["system_mode"] in ["DEMO", "VALIDATED"]

def test_workers_list(client):
    auth_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@sentridose.io", "password": "admin123"}
    )
    token = auth_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/v1/workers", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
