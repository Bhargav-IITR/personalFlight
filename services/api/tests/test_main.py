from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_is_available() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_search_applies_matching_card_offer() -> None:
    response = client.post(
        "/v1/searches",
        json={
            "origin": "BOM",
            "destination": "DEL",
            "departure_date": "2026-11-18",
            "payment_profiles": [{"label": "HDFC Regalia", "bank": "HDFC", "card_type": "credit", "network": "Visa"}],
        },
    )
    assert response.status_code == 200
    goibibo_offer = response.json()["flights"][0]["offers"][0]
    assert goibibo_offer["fare"]["eligible_discount"] == 750
    assert goibibo_offer["fare"]["payable_total"] == 5219


def test_search_rejects_raw_card_fields() -> None:
    response = client.post(
        "/v1/searches",
        json={
            "origin": "BOM",
            "destination": "DEL",
            "departure_date": "2026-11-18",
            "payment_profiles": [{"label": "Nope", "bank": "HDFC", "card_type": "credit", "pan": "4111111111111111"}],
        },
    )
    assert response.status_code == 422


def test_quote_retrieves_stable_offer_with_explanation() -> None:
    search = client.post(
        "/v1/searches",
        json={"origin": "BOM", "destination": "DEL", "departure_date": "2026-11-18"},
    )
    offer_id = search.json()["flights"][0]["offers"][0]["id"]
    quote = client.post(f"/v1/offers/{offer_id}/quote", json={"payment_profiles": []})
    assert quote.status_code == 200
    assert quote.json()["offer"]["id"] == offer_id
    assert quote.json()["explanation"]
