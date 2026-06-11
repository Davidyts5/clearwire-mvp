import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionManager from "@/components/SessionManager";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ClearWire | B2B Anti-Fraud Payments",
  description: "Cryptographic out-of-band payment authorization.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-slate-50 text-slate-900">
          <nav className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-2 font-bold text-xl tracking-tight">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
              <span>ClearWire</span>
            </div>
            
            {/* The new Session Manager injects the Logout button and inactivity timer dynamically */}
            <SessionManager />
            
          </nav>
          <main className="p-4 md:p-8 max-w-5xl mx-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
