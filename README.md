# PersonalFlight

An India-first flight metasearch application for comparing **all-in bookable prices** across providers, personalized to the traveller's eligible payment offers.

The product promise is deliberately precise: show the best available *estimated or verified final payable price*, clearly label its confidence and freshness, and explain the fees and eligible discounts behind it.

See [the product and implementation plan](docs/PLAN.md) for the proposed architecture and roadmap.

## What is implemented

- A responsive Next.js prototype that compares itemized provider quotes, applies only matching card-profile offers, and exposes verified/estimated price states.
- A FastAPI fixture-mode API contract with validation that explicitly rejects raw card fields.
- A Supabase migration for normalized offers, price components, promotions, eligibility-only payment profiles, immutable quotes, and Row Level Security.

The prototype uses simulated data only. It does not claim to fetch live fares or deep-link to booking platforms. Real integrations must be enabled only after the provider-specific approval path described in the plan.

## Run locally

Web app (requires Node 22+):

```powershell
npm install
npm run dev
```

Visit `http://localhost:3000`.

API (requires Python 3.12+):

```powershell
cd services/api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Run API tests with `pytest`. Apply the SQL migration through the Supabase CLI or the Supabase SQL editor before attaching persistence.

