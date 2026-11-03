from datetime import date, datetime
from enum import StrEnum
from typing import Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PriceState(StrEnum):
    VERIFIED = "verified"
    ESTIMATED_HIGH_CONFIDENCE = "estimated_high_confidence"
    ESTIMATED_LOW_CONFIDENCE = "estimated_low_confidence"


class CabinClass(StrEnum):
    ECONOMY = "economy"
    PREMIUM_ECONOMY = "premium_economy"
    BUSINESS = "business"


class SearchRequest(BaseModel):
    origin: str = Field(min_length=3, max_length=3, examples=["BOM"])
    destination: str = Field(min_length=3, max_length=3, examples=["DEL"])
    departure_date: date
    adults: int = Field(default=1, ge=1, le=9)
    cabin: CabinClass = CabinClass.ECONOMY
    payment_profiles: list["PaymentProfileInput"] = Field(default_factory=list, max_length=12)

    @field_validator("origin", "destination")
    @classmethod
    def airport_code(cls, value: str) -> str:
        normalized = value.upper()
        if not normalized.isalpha():
            raise ValueError("Airport codes must contain only letters")
        return normalized


class PaymentProfileInput(BaseModel):
    """Eligibility attributes only. PAN/CVV/expiry/payment credentials are intentionally absent."""

    label: str = Field(min_length=1, max_length=80)
    bank: Literal["HDFC", "ICICI", "Axis", "SBI", "Other"]
    card_type: Literal["credit", "debit"]
    network: Literal["Visa", "Mastercard", "RuPay", "Amex"] | None = None

    model_config = ConfigDict(extra="forbid")


class Promotion(BaseModel):
    bank: str
    card_type: Literal["credit", "debit"]
    amount: int = Field(gt=0)
    min_spend: int = Field(ge=0)
    promo_code: str | None = None
    terms: str


class PriceBreakdown(BaseModel):
    base_fare: int = Field(ge=0)
    airline_taxes: int = Field(ge=0)
    provider_fee: int = Field(ge=0)
    payment_fee: int = Field(ge=0)
    eligible_discount: int = Field(ge=0)
    payable_total: int = Field(ge=0)


class ProviderOffer(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    provider: str
    booking_url: str | None = None
    price_state: PriceState
    checked_at: datetime
    source_kind: Literal["fixture", "partner", "permitted_page"]
    fare: PriceBreakdown
    promotion: Promotion | None = None
    offer_terms_version: str


class FlightOption(BaseModel):
    itinerary_id: UUID = Field(default_factory=uuid4)
    airline: str
    flight_number: str
    origin: str
    destination: str
    departure_time: datetime
    arrival_time: datetime
    duration_minutes: int
    stops: int
    offers: list[ProviderOffer]


class SearchResponse(BaseModel):
    search_id: UUID = Field(default_factory=uuid4)
    generated_at: datetime
    data_mode: Literal["fixture", "live"]
    disclaimer: str
    payment_profiles_used: int
    flights: list[FlightOption]


class QuoteRequest(BaseModel):
    payment_profiles: list[PaymentProfileInput] = Field(default_factory=list, max_length=12)


class QuoteResponse(BaseModel):
    quote_id: UUID = Field(default_factory=uuid4)
    offer: ProviderOffer
    quote_expires_at: datetime
    explanation: list[str]
