import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { NotificationsProvider } from "@/context/NotificationsContext";
import CookieNotice from "@/components/CookieNotice";
import LegalLinks from "@/components/LegalLinks";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ClearWire | Payment request review",
  description: "Payment-request review, passkey approvals, and decision history for business finance teams.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
          <NotificationsProvider>
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
            <footer className="border-t border-[#dfe1d7] bg-[#f7f6f0] px-4 py-5 sm:px-6">
              <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-[#59665d]">ClearWire · Payment-request review demo</p>
                <LegalLinks />
              </div>
            </footer>
          </div>
          </NotificationsProvider>
        </div>
        <CookieNotice />
      </body>
    </html>
  );
}
