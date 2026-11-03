# PersonalFlight — Product & Delivery Plan

## 1. Product thesis

Finding the cheapest flight is unnecessarily opaque. An itinerary that appears cheapest in search often becomes more expensive after convenience fees, payment charges, taxes, and ineligible bank offers are applied. PersonalFlight will compare booking providers on the amount a traveller can realistically pay, rather than the advertised base fare.

### Core promise

For every displayed itinerary and provider offer, show:

1. **Final payable price** — verified when fresh checkout evidence exists; otherwise a calibrated prediction.
2. **Price composition** — base fare, airline taxes, provider/service fees, payment fees, and discount.
3. **Personalized eligible price** — calculated only from offers compatible with the traveller's declared card attributes.
4. **Evidence and confidence** — source, checked time, prediction band, terms, and the reason an offer may not apply.

The UI must never present a predicted amount as a guaranteed checkout quote. The final booking-platform price remains authoritative until a provider supports a contractual quote/booking API.

## 2. Target users and MVP scope

### Primary user

An India-based leisure or business traveller comparing domestic one-way or return flights and holding one or more Indian credit cards.

### MVP (single-country, 3 providers)

- Search domestic economy flights by origin, destination, dates, passengers, and cabin.
- Normalize results from 2–3 compliant data sources/providers.
- Rank provider offers by personalized all-in payable price.
- Support a private "wallet" of non-sensitive card eligibility attributes: issuer, network, card family/tier, credit/debit, and optional EMI availability.
- Explain fees, discounts, eligibility assumptions, expiry, and evidence freshness.
- Deep-link to the provider; record a user-reported checkout delta to improve estimates.
- Collect checkout snapshots with an internal operations tool and provider-specific consented/contractual integrations.

### Explicitly out of scope for MVP

- Taking payment, issuing tickets, storing PAN/CVV, or acting as merchant of record.
- International itineraries, multi-city trips, bundles, loyalty redemptions, and mixed-cabin combinations.
- Claiming bank-offer eligibility without enough information to evaluate its terms.
- Attempting to bypass logins, CAPTCHAs, rate limits, robots controls, or provider access restrictions.

## 3. Data acquisition strategy

The quality of an all-in-price product depends on lawful, stable, attributable data. Prefer these options in order:

1. **Contractual APIs/affiliate feeds or direct partnerships** for inventory, taxes, fees, offers, and booking deep links.
2. **Public provider pages where collection is permitted** by terms and robots policy, at conservative rates, with caching and a documented source policy.
3. **User-contributed, redacted checkout evidence** with explicit consent.
4. **Human-operated internal QA sessions** in accounts and environments the company controls.

Automated browser flows are a last-mile evidence collection mechanism, not the primary search path. They must honor provider permissions, have strict concurrency/rate budgets, stop at authentication/CAPTCHA/payment walls, redact PII, and retain only required pricing evidence. Provider-facing automation should use dedicated test accounts only where authorized.

## 4. System architecture

```text
Next.js web app
  ├─ Search / compare / wallet / price explanation
  └─ Supabase Auth, Realtime, Storage
          │
FastAPI API (public, authenticated)
  ├─ Search orchestration and ranking
  ├─ Wallet eligibility evaluation
  ├─ Price quote / explanation API
  └─ Admin and feedback APIs
          │
PostgreSQL + Supabase
  ├─ normalized itinerary/offers/promotions/evidence
  ├─ user wallet eligibility profile (encrypted/minimized)
  └─ quote/audit/feedback history
          │
Async workers (separate processes)
  ├─ provider feed adapters and permitted browser collectors
  ├─ promotion extraction and validation
  ├─ price verification and feature generation
  └─ model training/evaluation/deployment
```

### Runtime choices

- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind/shadcn-ui, TanStack Query, Zod, Playwright only for first-party end-to-end tests.
- **API:** Python 3.12, FastAPI, Pydantic v2, SQLAlchemy/Alembic, `httpx`, structured logging, OpenTelemetry.
- **Async:** Redis plus Celery or Dramatiq for scheduled ingestion, verification, and training jobs. Keep workers separate from API web processes.
- **Data:** Supabase PostgreSQL, Auth, Storage, Row Level Security, and optionally pgvector for offer-text similarity/cache retrieval.
- **Models:** Start with interpretable gradient-boosted regression (LightGBM/XGBoost); version models and features with MLflow or a small in-house registry. Use a constrained LLM extraction service with schema validation for promotion text.
- **Deployment:** Vercel for Next.js; containerized FastAPI/workers on a managed container platform; Supabase managed project; secrets in managed secret storage.

## 5. Price lifecycle

1. **Ingest:** a source adapter receives a raw offer, promotion text, and any permitted checkout observation.
2. **Normalize:** map airline, airport, flight segment, fare family, passenger composition, currency, provider, payment channel, and timestamps to canonical records.
3. **Deduplicate:** group offers into an itinerary/fare signature while retaining each provider's offer as a separate purchase option.
4. **Evaluate promotions:** parse promotion terms, validate their schema, test wallet eligibility, and calculate all eligible discount scenarios.
5. **Estimate:** calculate `base + mandatory taxes + predicted provider/payment fees − best eligible discount`. Return a lower/upper uncertainty interval and evidence status.
6. **Rank:** sort by selected view: personalized payable, non-card payable, confidence, duration, or departure time. Do not blend incomparable confidence levels silently.
7. **Verify asynchronously:** high-demand, low-confidence, or top-ranked offers are rechecked using permitted sources; supersede stale estimates.
8. **Learn:** compare verified/observed checkout totals to forecasts; store residuals and retrain after data-quality checks.

### Price states

| State | Meaning | UI treatment |
| --- | --- | --- |
| `verified` | Fresh source evidence supports the final amount | Prominent price, timestamp, fee breakdown |
| `estimated_high_confidence` | Model within defined accuracy/error and fresh provider features | Show "estimated" and interval |
| `estimated_low_confidence` | Sparse/stale evidence or broad uncertainty | De-emphasize, disclose range, prioritize recheck |
| `ineligible_or_unknown` | Terms cannot be safely evaluated | Do not advertise discounted final price |
| `expired` | Beyond TTL or offer ended | Exclude from default ranking |

## 6. AI/ML design

### A. Fee prediction: regression first, not an opaque LLM

Predict provider-controlled checkout delta (convenience/platform/payment/ancillary mandatory charges) using historical verified observations.

**Feature candidates:** provider, route/city pair, airline, itinerary/fare family, base fare and tax components, booking lead time, passenger count, date/time/day, device/channel when permitted, payment category, promotion presence, source freshness, and policy version.

**Output:** predicted delta, calibrated prediction interval, model version, and a confidence score. The displayed final price is only produced when mandatory known components are available and its uncertainty is acceptable.

**Guardrails:** train per provider where enough evidence exists; time-based train/validation splits; monitor MAE, 90th-percentile absolute error, calibration coverage, and bias by price band/route/provider; automatically fall back to a range or "verify at provider" after drift.

**Semantic caching:** cache normalized price/fee patterns by provider + route + airline + fare class + traveller/payment context. It reduces verification traffic but is not a substitute for model calibration or TTLs.

### B. Promotion extraction: LLM as structured-data candidate generator

On promotion ingestion, send the banner/text plus provider/date context to a small specialized model with strict JSON-schema output. Required fields include issuer, card type/network, offer type, percentage/flat amount, cap, minimum spend, EMI restriction, travel/booking dates, route restrictions, promo code, payment mode, source text, and extractor confidence.

Pipeline: `raw text → LLM JSON → schema validation → deterministic term checks → human review queue for low confidence/conflicts → versioned promotion record`.

Never let the LLM make the final eligibility or discount arithmetic decision. Preserve source text and the parsed-field provenance for auditability.

### C. Agentic UI collection: bounded, supervised capability

Use a browser agent only in authorized environments to navigate variants such as "skip add-ons" and "continue to payment", collect rendered price breakdowns, and produce structured evidence. Implement a provider-specific policy of allowed domains/actions, maximum navigation steps, screenshots/DOM evidence with PII redaction, failure screenshots, and a human-review fallback. No credential collection, CAPTCHA solving, or payment submission.

## 7. Data model (initial)

### Core catalog/search

- `providers`, `provider_policies`, `airlines`, `airports`
- `itineraries`, `segments`, `fare_signatures`
- `provider_offers`, `offer_price_components`, `price_quotes`
- `checkout_observations`, `source_artifacts`, `verification_runs`

### Promotions and personalization

- `promotions`, `promotion_versions`, `promotion_terms`, `promotion_extractions`
- `user_payment_profiles` (non-sensitive eligibility attributes only)
- `quote_discount_scenarios`, `quote_explanations`

### ML and operations

- `feature_snapshots`, `model_versions`, `prediction_logs`, `drift_metrics`
- `ingestion_runs`, `job_failures`, `audit_events`, `user_feedback`

Use UUID primary keys, immutable observed evidence, effective date ranges for promotion/model versions, and provider/source identifiers on all derived values. Apply Supabase RLS so users can access only their wallet, saved searches, quotes, and feedback.

## 8. API surface (v1)

- `POST /v1/searches` — validates search criteria and returns a search id.
- `GET /v1/searches/{id}/offers` — paginated/streamed normalized provider offers with price state and ranking mode.
- `GET /v1/offers/{id}/quote` — personalized breakdown, eligible promotions, assumptions, confidence, and timestamp.
- `PUT /v1/me/payment-profiles` — create/update masked eligibility profile; rejects PAN/CVV/full card number fields.
- `GET /v1/me/payment-profiles` — retrieve user profiles.
- `POST /v1/feedback/checkout` — optional reported final price and redacted evidence.
- `POST /v1/admin/ingestion/*` and `/v1/admin/promotions/*` — role-protected operations endpoints.

Use idempotency keys on writes, request/response schemas shared or generated for TypeScript, correlation IDs, and immutable quote IDs so a displayed result remains explainable.

## 9. Frontend experience

1. **Search:** simple route/date/passenger selection; present data recency expectation before searching.
2. **Results:** group same itinerary; expand providers to compare their all-in price, certainty label, estimated saving, and departure details.
3. **Price explainer:** an itemized equation, provider evidence timestamp, predicted component marker, promotion terms, card-profile match, and confidence/range.
4. **Wallet:** add cards as e.g. “HDFC credit card, Visa, Regalia” — never ask for card number/CVV/expiry. Let users turn profiles on/off.
5. **Redirect:** explain that provider checkout is final and preserve outgoing-click / quote IDs for later measurement.
6. **Feedback:** after redirect, invite optional “Was this price accurate?” feedback, with a privacy-safe screenshot receipt option.

Accessibility, INR formatting, mobile performance, and an honest empty/stale-data state are first-class acceptance criteria.

## 10. Security, privacy, and compliance

- Do not collect or store raw card PAN, CVV, bank credentials, passenger PII, or payment tokens for this metasearch product.
- Encrypt sensitive profile fields at rest where appropriate; minimize retention; provide deletion/export flows; log access to operational data.
- Separate production, test, and partner credentials; use short-lived service credentials; rotate keys.
- Perform a legal/terms review for every provider integration and maintain an allowlist. Comply with applicable Indian privacy, consumer-protection, advertising, and payments requirements; obtain counsel before launch.
- Show offer terms and source attribution; maintain an appeal/correction flow for inaccurate offers.
- Treat screenshots, DOM captures, and model training data as potentially personal data: redact before storage and enforce TTLs.

## 11. Reliability and observability

- SLOs: search first useful results < 2s where cached/feed-backed; quote response < 500ms; source freshness target per provider; reported final-price error tracked separately for verified and estimated states.
- Monitor adapter latency/error rate, source freshness, fee-model calibration, promotion parse acceptance, mismatched observed totals, and redirect conversion.
- Use provider circuit breakers, exponential backoff, queues, dead-letter handling, per-provider budgets, and feature flags.
- Every displayed quote records source evidence ids, feature snapshot, model version, promotion versions, decision trace, and calculated components.

## 12. Delivery roadmap

### Phase 0 — Discovery and provider viability (2–3 weeks)

- Interview 10–15 target travellers; define transparency copy and willingness to save card-profile data.
- Score candidate providers on legal access, coverage, offer quality, and partnership feasibility.
- Secure first data/affiliate partnership(s); define permitted collection policy.
- Create a labeled sample of checkout observations and promotion banners.
- Set price-accuracy thresholds and a go/no-go metric for each provider.

### Phase 1 — Foundation (2 weeks)

- Monorepo setup: `apps/web`, `services/api`, `workers`, `packages/contracts`, `infra`.
- Supabase project, migrations, RLS, Auth, local Docker/Compose dev dependencies, CI, lint/type/test checks.
- Core schema, provider adapter interface, fixture provider, observability baseline, and secrets management.

### Phase 2 — Transparent-search MVP (3–4 weeks)

- Build Search, Results, Provider comparison, and Price Explainer UX.
- Integrate first compliant source, normalize offers, persist price components/evidence.
- Add user card eligibility profiles and deterministic promotion rules for reviewed offers.
- Add deep links, quote audit trails, freshness labels, and feedback collection.

**MVP exit bar:** users can compare at least two providers for supported routes with clear all-in/estimated pricing and traceable explanations; no raw card data is held.

### Phase 3 — Prediction and promotion intelligence (3–4 weeks)

- Implement training dataset, fee-baseline model, interval calibration, drift monitoring, and safe fallback behavior.
- Add LLM promotion extraction behind validation/review; version offer terms.
- Add semantic cache with measured TTL/freshness trade-offs.
- Test price accuracy by provider and only expose personalized ranking where accuracy meets threshold.

### Phase 4 — Authorized verification automation (3–5 weeks)

- Implement provider policy layer, browser-worker sandbox, evidence redaction, and operational console.
- Add bounded agent navigation for approved providers; begin in shadow mode and compare to human verification.
- Gradually use verified evidence to refresh high-value offers; add circuit breakers and manual review.

### Phase 5 — Scale and commercialization (ongoing)

- Add providers one at a time with individual quality gates and partner agreements.
- Add watches/alerts, flexible dates, alerts for confidence changes, and eventually international coverage.
- Negotiate quote/booking APIs to convert estimates into guarantees where possible.

## 13. Initial backlog

1. Create monorepo and CI with Next.js, FastAPI, formatting, linting, type checks, and tests.
2. Provision Supabase and add migrations/RLS for users, provider offers, quotes, promotions, and non-sensitive payment profiles.
3. Define canonical offer and quote schemas plus fixture data.
4. Build search/results/explainer screens against fixtures.
5. Implement provider adapter contract and one approved data source.
6. Implement deterministic promotion evaluator and wallet eligibility matcher.
7. Add source evidence/freshness/quote audit trail.
8. Build feedback loop and checkout-observation ingestion.
9. Train/evaluate first provider-specific fee model.
10. Add LLM promotion extraction review workflow.

## 14. Key decisions needed before implementation

- Which two or three providers have an approved data/API/affiliate path for the first release?
- Is the initial market India domestic only, and which date/passenger/cabin combinations must be supported?
- What accuracy/range threshold earns an `estimated_high_confidence` label?
- Which card attributes may users provide, and what retention/deletion policy is acceptable?
- What launch business model (affiliate commission, referral fee, subscription, or hybrid) avoids compromising ranking transparency?

