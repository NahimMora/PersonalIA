import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

// Every page here reads live, per-user data straight from the database (auth
// gate, dashboard, activities...) — nothing is meant to be statically cached.
// Forcing this at the root also means `next build` never tries to prerender
// a page by querying the DB, which would require DATABASE_URL at build time
// (Hostinger's shared-hosting build step doesn't have it — only the running
// app does, see docs/DEPLOYMENT.md).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Segundo Cerebro",
  description: "Personal AI / Project Knowledge Hub",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0d" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
