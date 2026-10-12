import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { NotificationsProvider } from "@/context/NotificationsContext";
import CookieNotice from "@/components/CookieNotice";

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
          </div>
          </NotificationsProvider>
        </div>
        <CookieNotice />
      </body>
    </html>
  );
}
