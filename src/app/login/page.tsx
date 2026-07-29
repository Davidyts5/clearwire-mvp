"use client";

import { useState } from "react";
import { Stamp, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import Link from "next/link"; 
import { ROLES, Permissions } from "@/lib/roles";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const supabase = createClient();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session) {
        const params = new URLSearchParams(window.location.search);
        const nextUrl = params.get('next');

        if (nextUrl && nextUrl.startsWith('/')) {
          window.location.href = nextUrl;
          return;
        }

        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.session.user.id)
          .single();

        window.location.href = Permissions.getPortalRoute(userData?.role);
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-graphite font-body text-steel flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-line/30">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Stamp size={48} className="mx-auto text-wire mb-4" />
        <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-steel font-display">
          ClearWire Security
        </h2>
        <p className="mt-2 text-center text-sm text-slate">
          Secure B2B Payment Authorization
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-panel py-8 px-4 sm:px-10 border border-line/30">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-semibold text-slate uppercase tracking-wider mb-2 font-mono">Corporate Email</label>
              <div className="mt-1">
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full appearance-none rounded-none border border-line/50 bg-graphite px-3 py-2 text-steel placeholder-slate/50 focus:border-line focus:outline-none focus:ring-1 focus:ring-wire sm:text-sm"
                  placeholder="ap@yourcompany.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate uppercase tracking-wider mb-2 font-mono">Password</label>
              <div className="mt-1">
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full appearance-none rounded-none border border-line/50 bg-graphite px-3 py-2 text-steel placeholder-slate/50 focus:border-line focus:outline-none focus:ring-1 focus:ring-wire sm:text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="text-steel text-sm font-medium bg-signal-red p-3 rounded-none border border-signal-red">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full justify-center rounded-none border border-transparent bg-wire py-2.5 px-4 text-sm font-bold text-graphite hover:bg-steel focus:outline-none disabled:opacity-70 gap-2 items-center transition-colors"
              >
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                Sign In
              </button>
            </div>
          </form>
        </div>

        <div className="mt-8 text-center space-y-2">
          <p className="text-slate text-sm">
            Not part of a workspace yet? <Link href="/signup" className="font-bold text-wire hover:text-steel hover:underline">Create Company</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
