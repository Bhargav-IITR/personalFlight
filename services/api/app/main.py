from datetime import UTC, datetime, timedelta
from os import getenv
from uuid import UUID

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .models import QuoteRequest, QuoteResponse, SearchRequest, SearchResponse
from .pricing import find_fixture_offer, fixture_search

app = FastAPI(
    title="PersonalFlight API",
    version="0.1.0",
    description="Transparent, personalized all-in flight quote API.",
)

origins = [origin.strip() for origin in getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Content-Type", "Authorization", "Idempotency-Key"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "mode": getenv("PRICE_DATA_MODE", "fixture")}


@app.post("/v1/searches", response_model=SearchResponse)
def create_search(request: SearchRequest) -> SearchResponse:
    if request.origin == request.destination:
        raise HTTPException(status_code=422, detail="Origin and destination must differ")
    if getenv("PRICE_DATA_MODE", "fixture") != "fixture":
        raise HTTPException(status_code=503, detail="No approved live provider adapter is configured")
    return SearchResponse(
        generated_at=datetime.now(UTC),
        data_mode="fixture",
        disclaimer="Fixture data only. A booking provider's checkout price is authoritative.",
        payment_profiles_used=len(request.payment_profiles),
        flights=fixture_search(request.payment_profiles),
    )


@app.post("/v1/offers/{offer_id}/quote", response_model=QuoteResponse)
def quote_offer(offer_id: UUID, request: QuoteRequest) -> QuoteResponse:
    if getenv("PRICE_DATA_MODE", "fixture") != "fixture":
        raise HTTPException(status_code=503, detail="No approved live provider adapter is configured")
    offer = find_fixture_offer(offer_id, request.payment_profiles)
    if offer is None:
        raise HTTPException(status_code=404, detail="Offer not found or no longer available")

    explanation = [
        f"{offer.provider} total is fare + airline taxes + provider/payment fees.",
        f"Price state: {offer.price_state.value}; source mode: {offer.source_kind}.",
    ]
    if offer.fare.eligible_discount:
        explanation.append(f"Applied {offer.promotion.promo_code} because a matching saved eligibility profile was supplied.")
    elif offer.promotion:
        explanation.append("A promotion exists, but no supplied payment profile safely matched its eligibility terms.")

    return QuoteResponse(
        offer=offer,
        quote_expires_at=datetime.now(UTC) + timedelta(minutes=5),
        explanation=explanation,
    )
