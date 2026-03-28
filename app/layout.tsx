import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "HomeScope — AI-Annotated Home Inspection",
  description:
    "Upload your walkthrough video. Get an annotated inspection report with repair costs and a negotiation letter in under 60 seconds.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-base font-sans text-text-primary antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
