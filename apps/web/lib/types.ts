export type PriceState = "verified" | "estimated_high_confidence" | "estimated_low_confidence";

export type CardProfile = {
  id: string;
  label: string;
  bank: "HDFC" | "ICICI" | "Axis" | "SBI" | "Other";
  kind: "credit" | "debit";
  network?: "Visa" | "Mastercard" | "RuPay" | "Amex";
};

export type Discount = {
  bank: CardProfile["bank"];
  kind: CardProfile["kind"];
  amount: number;
  terms: string;
  code?: string;
};

export type ProviderQuote = {
  id: string;
  provider: string;
  baseFare: number;
  taxes: number;
  platformFee: number;
  paymentFee: number;
  state: PriceState;
  checkedAt: string;
  discount?: Discount;
  source: "fixture" | "partner" | "permitted_page";
};

export type Flight = {
  id: string;
  airline: string;
  flightNumber: string;
  departure: string;
  arrival: string;
  duration: string;
  stops: number;
  route: string;
  quotes: ProviderQuote[];
};
