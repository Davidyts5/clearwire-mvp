"use client";

import { useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

export default function CookieNotice() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <aside aria-label="Cookie information" className="fixed inset-x-3 bottom-3 z-[60] rounded-xl border border-[#cbd1c6] bg-white p-4 text-[#203329] shadow-[0_12px_38px_-18px_rgba(32,51,41,0.45)] sm:left-auto sm:right-5 sm:max-w-md">
      <div className="flex items-start gap-3">
        <p className="min-w-0 flex-1 text-sm leading-6">
          ClearWire uses essential authentication cookies to sign you in and maintain your session. No advertising or marketing-analytics tags are included in this app build.{' '}
          <Link href="/cookies" className="font-semibold text-[#315741] underline underline-offset-4">Cookie details</Link>
        </p>
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Dismiss cookie information"
          className="rounded-md p-1 text-[#405046] transition-colors hover:bg-[#f0f1eb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315741] focus-visible:ring-offset-2"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <p className="mt-2 text-xs leading-5 text-[#59665d]">Dismissing this notice does not give consent to optional tracking. Your dismissal is not saved after a reload.</p>
    </aside>
  );
}
