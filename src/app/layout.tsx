import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionManager from "@/components/SessionManager";
import Link from "next/link";
import { ShieldCheck, Building2, FileText, Users, Activity } from "lucide-react";

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
        <div className="min-h-screen bg-slate-50 text-slate-900 flex">
          
          {/* Global Sidebar Navigation */}
          <div className="w-64 bg-slate-900 text-slate-300 flex flex-col hidden md:flex min-h-screen shrink-0 border-r border-slate-800">
            <div className="p-6 flex items-center gap-2 font-bold text-xl tracking-tight text-white border-b border-slate-800">
              <ShieldCheck className="text-blue-400" size={28} />
              <span>ClearWire</span>
            </div>
            
            <div className="flex-1 py-6 px-4 space-y-2">
              <Link href="/login" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
                <Activity size={18} /> Dashboard
              </Link>
              <Link href="/vendors" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
                <Building2 size={18} /> Vendors
              </Link>
              <Link href="/auditor-dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
                <FileText size={18} /> Audit Logs
              </Link>
              <Link href="/cfo-portal/team" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
                <Users size={18} /> Team & Policies
              </Link>
            </div>
            
            <div className="p-4 border-t border-slate-800">
               <SessionManager />
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Mobile Header */}
            <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
                <ShieldCheck className="text-blue-400" size={24} />
                <span>ClearWire</span>
              </div>
              <SessionManager />
            </div>

            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>

        </div>
      </body>
    </html>
  );
}
