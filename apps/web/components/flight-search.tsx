"use client";

import { FormEvent, useMemo, useState } from "react";
import { demoCards, demoFlights } from "../lib/demo-data";
import type { CardProfile, Flight, ProviderQuote } from "../lib/types";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function baseTotal(quote: ProviderQuote) {
  return quote.baseFare + quote.taxes + quote.platformFee + quote.paymentFee;
}

function applicableDiscount(quote: ProviderQuote, cards: CardProfile[]) {
  if (!quote.discount) return 0;
  return cards.some((card) => card.bank === quote.discount?.bank && card.kind === quote.discount?.kind)
    ? quote.discount.amount
    : 0;
}

function quoteTotal(quote: ProviderQuote, cards: CardProfile[]) {
  return baseTotal(quote) - applicableDiscount(quote, cards);
}

function stateCopy(state: ProviderQuote["state"]) {
  if (state === "verified") return "Verified";
  if (state === "estimated_high_confidence") return "Estimated · high confidence";
  return "Estimated · needs recheck";
}

function stateClass(state: ProviderQuote["state"]) {
  if (state === "verified") return "status verified";
  if (state === "estimated_high_confidence") return "status estimated";
  return "status caution";
}

type QuoteWithFlight = ProviderQuote & { flight: Flight };

export function FlightSearch() {
  const [activeCards, setActiveCards] = useState<CardProfile[]>(demoCards);
  const [searched, setSearched] = useState(true);
  const [expanded, setExpanded] = useState<string | null>("ai-864-goibibo");
  const [showWallet, setShowWallet] = useState(false);

  const rankedFlights = useMemo(() => {
    return demoFlights
      .map((flight) => ({
        flight,
        cheapest: [...flight.quotes].sort((a, b) => quoteTotal(a, activeCards) - quoteTotal(b, activeCards))[0],
      }))
      .sort((a, b) => quoteTotal(a.cheapest, activeCards) - quoteTotal(b.cheapest, activeCards));
  }, [activeCards]);

  const allQuotes = useMemo<QuoteWithFlight[]>(
    () => demoFlights.flatMap((flight) => flight.quotes.map((quote) => ({ ...quote, flight }))),
    [],
  );
  const bestQuote = [...allQuotes].sort((a, b) => quoteTotal(a, activeCards) - quoteTotal(b, activeCards))[0];

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearched(true);
    setExpanded(null);
  }

  function toggleCard(card: CardProfile) {
    setActiveCards((current) =>
      current.some((existing) => existing.id === card.id)
        ? current.filter((existing) => existing.id !== card.id)
        : [...current, card],
    );
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="PersonalFlight home">
          <span className="brand-mark">✦</span>
          <span>personal<span>flight</span></span>
        </a>
        <div className="topbar-actions">
          <span className="demo-pill">Prototype · fixture data</span>
          <button className="wallet-button" onClick={() => setShowWallet(!showWallet)} type="button">
            <span>▣</span> My cards <b>{activeCards.length}</b>
          </button>
        </div>
      </header>

      <section className="hero" id="top">
        <p className="eyebrow">FLIGHT SEARCH, WITHOUT THE LAST-MINUTE SURPRISE</p>
        <h1>The price you see should be<br /><em>the price you pay.</em></h1>
        <p className="hero-copy">Compare providers by final payable price, including platform fees and only the bank offers that match your cards.</p>
      </section>

      <section className="search-shell" aria-label="Search flights">
        <form onSubmit={submitSearch}>
          <label className="field route-field">
            <span>From</span>
            <strong>Mumbai</strong>
            <small>BOM · Chhatrapati Shivaji Maharaj</small>
          </label>
          <span className="swap" aria-hidden="true">⇄</span>
          <label className="field route-field">
            <span>To</span>
            <strong>Delhi</strong>
            <small>DEL · Indira Gandhi International</small>
          </label>
          <label className="field date-field">
            <span>Depart</span>
            <strong>18 Nov</strong>
            <small>Wednesday, 2026</small>
          </label>
          <label className="field traveller-field">
            <span>Travellers</span>
            <strong>1 traveller</strong>
            <small>Economy</small>
          </label>
          <button className="search-button" type="submit">Search flights <span>→</span></button>
        </form>
      </section>

      {showWallet && (
        <section className="wallet-panel" aria-label="Card profiles">
          <div>
            <p className="eyebrow">YOUR CARD PROFILES</p>
            <h2>Only matching offers are used</h2>
            <p>We store card eligibility details—not card numbers, CVV, or payment credentials.</p>
          </div>
          <div className="card-toggles">
            {demoCards.map((card) => {
              const enabled = activeCards.some((active) => active.id === card.id);
              return (
                <button className={`card-toggle ${enabled ? "selected" : ""}`} key={card.id} onClick={() => toggleCard(card)} type="button">
                  <span className="card-icon">{enabled ? "✓" : "+"}</span>
                  <span><b>{card.label}</b><small>{card.kind} · {card.network}</small></span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {searched && (
        <section className="results-wrap">
          <div className="result-heading">
            <div>
              <p className="eyebrow">{rankedFlights.length} FLIGHTS · {allQuotes.length} PROVIDER QUOTES</p>
              <h2>Mumbai <span>→</span> Delhi</h2>
            </div>
            <div className="rank-copy">
              <span className="sparkle">✦</span>
              <span>Ranked by your <b>all-in price</b></span>
            </div>
          </div>

          <div className="notice">
            <span>ⓘ</span>
            <p><b>This is a product prototype.</b> Quotes below are simulated, not live fares. In production, each price will show its provider evidence, freshness, and estimate range.</p>
          </div>

          <div className="best-deal">
            <div className="best-label"><span>BEST FOR YOU</span><small>Across all flights & providers</small></div>
            <div className="best-flight"><b>{bestQuote.flight.airline} {bestQuote.flight.flightNumber}</b><span>{bestQuote.flight.departure} → {bestQuote.flight.arrival} · {bestQuote.provider}</span></div>
            <div className="best-price"><small>Final payable price</small><b>{currency.format(quoteTotal(bestQuote, activeCards))}</b></div>
          </div>

          <div className="flight-list">
            {rankedFlights.map(({ flight, cheapest }) => (
              <article className="flight-card" key={flight.id}>
                <div className="flight-summary">
                  <div className="airline"><span className="airline-logo">{flight.airline.slice(0, 1)}</span><span><b>{flight.airline}</b><small>{flight.flightNumber}</small></span></div>
                  <div className="times"><b>{flight.departure}</b><span><i></i><small>{flight.duration}</small><i></i></span><b>{flight.arrival}</b><small>Non-stop</small></div>
                  <div className="starts-at"><small>Best personalised price</small><b>{currency.format(quoteTotal(cheapest, activeCards))}</b><span>{cheapest.provider}</span></div>
                </div>
                <div className="provider-list">
                  {[...flight.quotes]
                    .sort((a, b) => quoteTotal(a, activeCards) - quoteTotal(b, activeCards))
                    .map((quote, index) => {
                      const discount = applicableDiscount(quote, activeCards);
                      const isOpen = expanded === quote.id;
                      return (
                        <div className={`provider-quote ${index === 0 ? "lowest" : ""}`} key={quote.id}>
                          <button className="quote-row" onClick={() => setExpanded(isOpen ? null : quote.id)} type="button" aria-expanded={isOpen}>
                            <span className="provider-name"><b>{quote.provider}</b>{index === 0 && <em>LOWEST</em>}<small>{quote.source === "fixture" ? "Demo source" : "Source evidence available"} · Checked {quote.checkedAt}</small></span>
                            <span className={stateClass(quote.state)}>{stateCopy(quote.state)}</span>
                            <span className="quote-price"><b>{currency.format(quoteTotal(quote, activeCards))}</b>{discount > 0 ? <small className="discount">includes {currency.format(discount)} card offer</small> : <small>all-in before card offer</small>}</span>
                            <span className="chevron">{isOpen ? "⌃" : "⌄"}</span>
                          </button>
                          {isOpen && <PriceBreakdown quote={quote} cards={activeCards} />}
                        </div>
                      );
                    })}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="how-it-works">
        <p className="eyebrow">NO BLACK-BOX PRICING</p>
        <h2>Every number has an explanation.</h2>
        <div className="principles">
          <div><span>01</span><h3>All-in by default</h3><p>We separate fare, tax, platform, and payment components before ranking providers.</p></div>
          <div><span>02</span><h3>Cards that are yours</h3><p>Discounts are applied only if a saved eligibility profile matches their terms.</p></div>
          <div><span>03</span><h3>Honest confidence</h3><p>Verified and estimated prices are visibly different—never quietly mixed.</p></div>
        </div>
      </section>
    </main>
  );
}

function PriceBreakdown({ quote, cards }: { quote: ProviderQuote; cards: CardProfile[] }) {
  const discount = applicableDiscount(quote, cards);
  const hasOfferButNotEligible = Boolean(quote.discount) && discount === 0;
  return (
    <div className="breakdown">
      <div className="breakdown-grid">
        <div>
          <p className="eyebrow">PAYABLE PRICE BREAKDOWN</p>
          <dl>
            <div><dt>Base fare</dt><dd>{currency.format(quote.baseFare)}</dd></div>
            <div><dt>Airline taxes & fees</dt><dd>{currency.format(quote.taxes)}</dd></div>
            <div><dt>{quote.state === "verified" ? "Provider fee" : "Estimated provider fee"}</dt><dd>{currency.format(quote.platformFee)}</dd></div>
            {quote.paymentFee > 0 && <div><dt>Payment fee</dt><dd>{currency.format(quote.paymentFee)}</dd></div>}
            {discount > 0 && <div className="deduction"><dt>{quote.discount?.code} card offer</dt><dd>−{currency.format(discount)}</dd></div>}
            <div className="total"><dt>Final payable price</dt><dd>{currency.format(quoteTotal(quote, cards))}</dd></div>
          </dl>
        </div>
        <aside className="evidence-card">
          <span className={stateClass(quote.state)}>{stateCopy(quote.state)}</span>
          <p>{quote.state === "verified" ? "This breakdown was checked against available source evidence." : "The provider fee is a prediction in this prototype. A production quote includes a confidence range and evidence reference."}</p>
          <small>Checked {quote.checkedAt} · {quote.source === "fixture" ? "Prototype fixture" : "Provider source"}</small>
        </aside>
      </div>
      {quote.discount && <div className={`offer-note ${discount > 0 ? "eligible" : ""}`}><span>{discount > 0 ? "✓" : "ⓘ"}</span><div><b>{discount > 0 ? `Your ${quote.discount.bank} card qualifies` : `${quote.discount.bank} offer available`}</b><p>{hasOfferButNotEligible ? "Add a matching card profile to include this discount. " : ""}{quote.discount.terms}</p></div></div>}
      <div className="booking-action"><span>Provider checkout is final. We’ll preserve this quote’s explanation when you leave.</span><button type="button" disabled>Continue to {quote.provider} <span>↗</span></button></div>
    </div>
  );
}
