-- PersonalFlight initial schema. Card profiles deliberately contain eligibility metadata only.
create extension if not exists pgcrypto;

create type public.price_state as enum ('verified', 'estimated_high_confidence', 'estimated_low_confidence', 'expired');
create type public.source_kind as enum ('fixture', 'partner', 'permitted_page', 'user_reported');
create type public.card_kind as enum ('credit', 'debit');

create table public.providers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  display_name text not null,
  integration_status text not null default 'pending_approval' check (integration_status in ('pending_approval', 'approved', 'paused', 'disabled')),
  created_at timestamptz not null default now()
);

create table public.itineraries (
  id uuid primary key default gen_random_uuid(),
  origin_iata char(3) not null check (origin_iata ~ '^[A-Z]{3}$'),
  destination_iata char(3) not null check (destination_iata ~ '^[A-Z]{3}$'),
  airline_code text not null,
  flight_number text not null,
  departure_at timestamptz not null,
  arrival_at timestamptz not null,
  stops smallint not null default 0 check (stops >= 0),
  created_at timestamptz not null default now(),
  check (origin_iata <> destination_iata),
  check (arrival_at > departure_at)
);

create table public.provider_offers (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id),
  itinerary_id uuid not null references public.itineraries(id),
  fare_family text,
  currency char(3) not null default 'INR' check (currency = 'INR'),
  base_fare_paise integer not null check (base_fare_paise >= 0),
  airline_taxes_paise integer not null check (airline_taxes_paise >= 0),
  source_kind public.source_kind not null,
  source_artifact_uri text,
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (expires_at > observed_at)
);
create index provider_offers_itinerary_freshness on public.provider_offers (itinerary_id, expires_at desc);

create table public.offer_price_components (
  id uuid primary key default gen_random_uuid(),
  provider_offer_id uuid not null references public.provider_offers(id) on delete cascade,
  component_type text not null check (component_type in ('provider_fee', 'payment_fee', 'ancillary_mandatory', 'discount')),
  amount_paise integer not null,
  is_predicted boolean not null default false,
  model_version text,
  confidence numeric(4,3) check (confidence between 0 and 1),
  evidence_uri text,
  created_at timestamptz not null default now(),
  check ((is_predicted and model_version is not null) or not is_predicted)
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id),
  external_key text,
  raw_text text not null,
  parsed_terms jsonb not null default '{}'::jsonb,
  extractor_confidence numeric(4,3) check (extractor_confidence between 0 and 1),
  effective_from timestamptz not null,
  effective_until timestamptz,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (provider_id, external_key)
);

create table public.payment_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  bank text not null check (bank in ('HDFC', 'ICICI', 'Axis', 'SBI', 'Other')),
  card_type public.card_kind not null,
  network text check (network in ('Visa', 'Mastercard', 'RuPay', 'Amex')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.payment_profiles is 'Eligibility only. Never store PAN, CVV, card expiry, bank credentials, or payment tokens.';

create table public.price_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  provider_offer_id uuid not null references public.provider_offers(id),
  price_state public.price_state not null,
  payable_total_paise integer not null check (payable_total_paise >= 0),
  applied_discount_paise integer not null default 0 check (applied_discount_paise >= 0),
  payment_profile_ids uuid[] not null default '{}',
  model_version text,
  explanation jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index price_quotes_user_created on public.price_quotes (user_id, created_at desc);

alter table public.payment_profiles enable row level security;
alter table public.price_quotes enable row level security;

create policy "Users manage only their own payment profiles"
  on public.payment_profiles for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users read only their own price quotes"
  on public.price_quotes for select to authenticated
  using ((select auth.uid()) = user_id);

-- Service-role ingestion workers bypass RLS; browser/client code never receives that key.
