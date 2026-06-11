"use client";

import { useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase"; 

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
        // FIX: Check if there is a 'next' redirect parameter in the URL (e.g., from an SMS link)
        const params = new URLSearchParams(window.location.search);
        const nextUrl = params.get('next');

        if (nextUrl && nextUrl.startsWith('/')) {
          window.location.href = nextUrl;
          return;
        }

        // Standard routing
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.session.user.id)
          .single();

        if (userData?.role === 'cfo') {
          window.location.href = '/cfo-portal';
        } else {
          window.location.href = '/dashboard';
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <ShieldCheck size={48} className="mx-auto text-blue-600 mb-2" />
        <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-slate-900">
          ClearWire Security
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Secure B2B Payment Authorization
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-slate-700">Corporate Email</label>
              <div className="mt-1">
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  placeholder="cfo@yourcompany.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <div className="mt-1">
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm font-medium bg-red-50 p-3 rounded-md border border-red-200">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 gap-2 items-center"
              >
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                Sign In
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
