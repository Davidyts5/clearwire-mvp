"use client";

import { useEffect } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { usePathname } from "next/navigation";

export default function SessionManager() {
  const pathname = usePathname();
  const isAuthRoute = pathname === '/login' || pathname === '/';

  const handleLogout = async () => {
    // 1. Tell Supabase to kill the session on the backend
    await supabase.auth.signOut();
    
    // 2. Mathematically destroy the secure cookies in the browser
    document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax; Secure';
    document.cookie = 'supabase-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax; Secure';
    
    // 3. Force redirect to login
    window.location.href = '/login';
  };

  useEffect(() => {
    if (isAuthRoute) return;

    let timeoutId: NodeJS.Timeout;
    const INACTIVITY_LIMIT_MS = 3600000; // 1 hour

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        alert("Your secure session has expired due to 1 hour of inactivity.");
        handleLogout();
      }, INACTIVITY_LIMIT_MS);
    };

    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    
    resetTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      clearTimeout(timeoutId);
    };
  }, [isAuthRoute]);

  if (isAuthRoute) {
    return <div className="text-sm font-medium text-slate-400">Enterprise Environment</div>;
  }

  return (
    <div className="flex items-center gap-4">
      <div className="hidden sm:flex items-center gap-2 text-emerald-400 text-xs font-semibold bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20">
        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
        Secure Session
      </div>
      <button 
        onClick={handleLogout} 
        className="flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 shadow-sm"
      >
        <LogOut size={16} /> Logout
      </button>
    </div>
  );
}
