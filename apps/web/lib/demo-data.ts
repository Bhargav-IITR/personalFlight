import type { CardProfile, Flight } from "./types";

export const demoCards: CardProfile[] = [
  { id: "hdfc-regalia", label: "HDFC Regalia", bank: "HDFC", kind: "credit", network: "Visa" },
  { id: "axis-ace", label: "Axis ACE", bank: "Axis", kind: "credit", network: "Mastercard" },
];

export const demoFlights: Flight[] = [
  {
    id: "ai-864",
    airline: "Air India",
    flightNumber: "AI 864",
    departure: "06:20",
    arrival: "08:30",
    duration: "2h 10m",
    stops: 0,
    route: "Mumbai (BOM) → Delhi (DEL)",
    quotes: [
      { id: "ai-864-goibibo", provider: "Goibibo", baseFare: 4838, taxes: 732, platformFee: 399, paymentFee: 0, state: "estimated_high_confidence", checkedAt: "2 min ago", source: "fixture", discount: { bank: "HDFC", kind: "credit", amount: 750, code: "HDFCFLY", terms: "₹750 off on HDFC Credit Cards. Min. booking ₹5,000. Demo terms." } },
      { id: "ai-864-cleartrip", provider: "Cleartrip", baseFare: 4950, taxes: 732, platformFee: 249, paymentFee: 0, state: "verified", checkedAt: "4 min ago", source: "fixture" },
      { id: "ai-864-ixigo", provider: "ixigo", baseFare: 4774, taxes: 732, platformFee: 550, paymentFee: 0, state: "estimated_low_confidence", checkedAt: "18 min ago", source: "fixture", discount: { bank: "Axis", kind: "credit", amount: 500, code: "AXISFLY", terms: "₹500 off on Axis Credit Cards. Min. booking ₹4,500. Demo terms." } },
    ],
  },
  {
    id: "6e-5067",
    airline: "IndiGo",
    flightNumber: "6E 5067",
    departure: "09:35",
    arrival: "11:45",
    duration: "2h 10m",
    stops: 0,
    route: "Mumbai (BOM) → Delhi (DEL)",
    quotes: [
      { id: "6e-5067-goibibo", provider: "Goibibo", baseFare: 5089, taxes: 732, platformFee: 349, paymentFee: 0, state: "verified", checkedAt: "3 min ago", source: "fixture", discount: { bank: "HDFC", kind: "credit", amount: 750, code: "HDFCFLY", terms: "₹750 off on HDFC Credit Cards. Min. booking ₹5,000. Demo terms." } },
      { id: "6e-5067-paytm", provider: "Paytm Travel", baseFare: 5004, taxes: 732, platformFee: 529, paymentFee: 0, state: "estimated_high_confidence", checkedAt: "5 min ago", source: "fixture" },
      { id: "6e-5067-cleartrip", provider: "Cleartrip", baseFare: 5140, taxes: 732, platformFee: 199, paymentFee: 0, state: "estimated_high_confidence", checkedAt: "7 min ago", source: "fixture" },
    ],
  },
  {
    id: "qp-1120",
    airline: "Akasa Air",
    flightNumber: "QP 1120",
    departure: "14:20",
    arrival: "16:35",
    duration: "2h 15m",
    stops: 0,
    route: "Mumbai (BOM) → Delhi (DEL)",
    quotes: [
      { id: "qp-1120-cleartrip", provider: "Cleartrip", baseFare: 4680, taxes: 732, platformFee: 449, paymentFee: 0, state: "estimated_high_confidence", checkedAt: "6 min ago", source: "fixture" },
      { id: "qp-1120-goibibo", provider: "Goibibo", baseFare: 4740, taxes: 732, platformFee: 349, paymentFee: 0, state: "estimated_low_confidence", checkedAt: "21 min ago", source: "fixture", discount: { bank: "HDFC", kind: "credit", amount: 750, code: "HDFCFLY", terms: "₹750 off on HDFC Credit Cards. Min. booking ₹5,000. Demo terms." } },
    ],
  },
];
