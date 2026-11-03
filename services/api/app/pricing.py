"""Deterministic fixture pricing. Replace only the adapter, not the quote contract, for a live provider."""

from datetime import UTC, datetime, timedelta
from uuid import NAMESPACE_URL, UUID, uuid5

from .models import (
    FlightOption,
    PaymentProfileInput,
    PriceBreakdown,
    PriceState,
    Promotion,
    ProviderOffer,
)

NOW = datetime.now(UTC)


def _eligible_discount(
    base_fare: int,
    taxes: int,
    provider_fee: int,
    promotion: Promotion | None,
    profiles: list[PaymentProfileInput],
) -> int:
    if promotion is None:
        return 0
    pre_discount_total = base_fare + taxes + provider_fee
    if pre_discount_total < promotion.min_spend:
        return 0
    if any(profile.bank == promotion.bank and profile.card_type == promotion.card_type for profile in profiles):
        return promotion.amount
    return 0


def make_offer(
    *,
    offer_key: str,
    provider: str,
    base_fare: int,
    taxes: int,
    provider_fee: int,
    state: PriceState,
    profiles: list[PaymentProfileInput],
    promotion: Promotion | None = None,
) -> ProviderOffer:
    discount = _eligible_discount(base_fare, taxes, provider_fee, promotion, profiles)
    return ProviderOffer(
        id=uuid5(NAMESPACE_URL, f"personalflight:fixture:{offer_key}"),
        provider=provider,
        price_state=state,
        checked_at=NOW - timedelta(minutes=4),
        source_kind="fixture",
        fare=PriceBreakdown(
            base_fare=base_fare,
            airline_taxes=taxes,
            provider_fee=provider_fee,
            payment_fee=0,
            eligible_discount=discount,
            payable_total=base_fare + taxes + provider_fee - discount,
        ),
        promotion=promotion,
        offer_terms_version="fixture-2026-11-03",
    )


HDFC_OFFER = Promotion(
    bank="HDFC",
    card_type="credit",
    amount=750,
    min_spend=5000,
    promo_code="HDFCFLY",
    terms="Fixture only: ₹750 off on HDFC Credit Cards for bookings of ₹5,000 or more.",
)
AXIS_OFFER = Promotion(
    bank="Axis",
    card_type="credit",
    amount=500,
    min_spend=4500,
    promo_code="AXISFLY",
    terms="Fixture only: ₹500 off on Axis Credit Cards for bookings of ₹4,500 or more.",
)


def fixture_search(profiles: list[PaymentProfileInput]) -> list[FlightOption]:
    departure = NOW.replace(hour=6, minute=20, second=0, microsecond=0)
    return [
        FlightOption(
            airline="Air India",
            flight_number="AI 864",
            origin="BOM",
            destination="DEL",
            departure_time=departure,
            arrival_time=departure + timedelta(hours=2, minutes=10),
            duration_minutes=130,
            stops=0,
            offers=[
                make_offer(offer_key="ai-864-goibibo", provider="Goibibo", base_fare=4838, taxes=732, provider_fee=399, state=PriceState.ESTIMATED_HIGH_CONFIDENCE, profiles=profiles, promotion=HDFC_OFFER),
                make_offer(offer_key="ai-864-cleartrip", provider="Cleartrip", base_fare=4950, taxes=732, provider_fee=249, state=PriceState.VERIFIED, profiles=profiles),
                make_offer(offer_key="ai-864-ixigo", provider="ixigo", base_fare=4774, taxes=732, provider_fee=550, state=PriceState.ESTIMATED_LOW_CONFIDENCE, profiles=profiles, promotion=AXIS_OFFER),
            ],
        ),
        FlightOption(
            airline="IndiGo",
            flight_number="6E 5067",
            origin="BOM",
            destination="DEL",
            departure_time=departure + timedelta(hours=3, minutes=15),
            arrival_time=departure + timedelta(hours=5, minutes=25),
            duration_minutes=130,
            stops=0,
            offers=[
                make_offer(offer_key="6e-5067-goibibo", provider="Goibibo", base_fare=5089, taxes=732, provider_fee=349, state=PriceState.VERIFIED, profiles=profiles, promotion=HDFC_OFFER),
                make_offer(offer_key="6e-5067-paytm", provider="Paytm Travel", base_fare=5004, taxes=732, provider_fee=529, state=PriceState.ESTIMATED_HIGH_CONFIDENCE, profiles=profiles),
            ],
        ),
    ]


def find_fixture_offer(offer_id: UUID, profiles: list[PaymentProfileInput]) -> ProviderOffer | None:
    for flight in fixture_search(profiles):
        for offer in flight.offers:
            if offer.id == offer_id:
                return offer
    return None
