import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import DemoBanner from "@/components/DemoBanner";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "VitaVault Health - Secure Pre-Deposits for Elderly Care",
  description: "A digital sanctuary where families weave threads of care into a secure vault of health. Pre-deposit funds for your loved ones' medication needs.",
  keywords: ["health", "elderly care", "medication", "family", "pre-deposit", "healthcare"],
  authors: [{ name: "VitaVault Health" }],
  openGraph: {
    title: "VitaVault Health - Secure Pre-Deposits for Elderly Care",
    description: "A digital sanctuary for family healthcare management",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        <Providers>
          <DemoBanner />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#343A40',
                color: '#fff',
                borderRadius: '8px',
              },
              success: {
                iconTheme: {
                  primary: '#28A745',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#DC3545',
                  secondary: '#fff',
                },
              },
            }}
          />
          {children}
        </Providers>
      </body>
    </html>
  );
}
