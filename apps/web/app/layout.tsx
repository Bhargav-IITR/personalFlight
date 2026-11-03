import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PersonalFlight | Prices without surprises",
  description: "Compare transparent, personalised all-in flight prices.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
