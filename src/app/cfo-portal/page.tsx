"use client";

import { ShieldCheck } from "lucide-react";

export default function CFOPortal() {
  return (
    <div className="max-w-4xl mx-auto mt-10">
      <div className="bg-slate-900 text-white p-6 rounded-t-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck size={32} className="text-blue-400" />
          <h1 className="text-2xl font-bold tracking-tight">Executive Trust Portal</h1>
        </div>
        <div className="text-sm font-medium bg-slate-800 px-3 py-1 rounded-full">
          CFO View
        </div>
      </div>
      <div className="bg-white p-8 rounded-b-xl shadow-sm border border-t-0 border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Pending Authorizations</h2>
        <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-lg text-slate-500">
          No pending wires require cryptographic signature at this time.
        </div>
      </div>
    </div>
  );
}
