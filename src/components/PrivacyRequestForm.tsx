"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function PrivacyRequestForm({ privacyEmail }: { privacyEmail?: string }) {
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submitRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/privacy/data-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestType: 'deletion', confirmed }),
      });
      const result = await response.json();

      if (response.status === 401) {
        setError('Sign in to record a request for your own account.');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not record the request.');
      setSubmitted(true);
    } catch (requestError: any) {
      setError(requestError.message || 'Could not record the request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div role="status" aria-live="polite" className="rounded-xl border border-[#c4d5c4] bg-[#eff3ed] p-5 text-[#203329]">
        <h2 className="font-semibold">Request recorded</h2>
        <p className="mt-2 text-sm leading-6">
          A deletion-review request was added to your workspace audit history. Nothing has been deleted, and this build does not automatically notify or process the request. Follow up with your workspace administrator.
        </p>
        {privacyEmail && <p className="mt-3 text-sm">You may also contact the configured privacy contact: <a className="font-semibold underline underline-offset-4" href={`mailto:${privacyEmail}`}>{privacyEmail}</a>.</p>}
      </div>
    );
  }

  return (
    <form onSubmit={submitRequest} className="rounded-xl border border-[#dedfd6] bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-[#203329]">Record an account-deletion request</h2>
      <p className="mt-2 text-sm leading-6 text-[#59665d]">
        This request is associated with the signed-in account and visible in the workspace audit history. It does not delete anything by itself.
      </p>
      <div className="mt-5 flex items-start gap-3">
        <input
          id="confirm-deletion-request"
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          required
          className="mt-1 h-4 w-4 rounded border-[#9ba398] accent-[#315741] focus-visible:outline-none"
        />
        <label htmlFor="confirm-deletion-request" className="text-sm leading-6 text-[#405046]">
          I am asking for a review of deletion of my ClearWire account data. I understand this records a request only; the workspace administrator and service operator must review it.
        </label>
      </div>
      {error && (
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">
          {error}{' '}
          {error.startsWith('Sign in') && <Link href="/login?next=%2Fprivacy%2Fdata-request" className="font-semibold underline underline-offset-4">Sign in</Link>}
        </div>
      )}
      <button
        type="submit"
        disabled={!confirmed || isSubmitting}
        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#315741] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#254733] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
        {isSubmitting ? 'Recording request…' : 'Record deletion request'}
      </button>
    </form>
  );
}
