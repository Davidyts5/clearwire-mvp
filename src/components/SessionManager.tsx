"use client";

import { useEffect, useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase"; 

interface SessionManagerProps {
  collapsed?: boolean;
  showBadge?: boolean;
}

export default function SessionManager({ collapsed = false, showBadge = true }: SessionManagerProps) {
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isAuthRoute = pathname === '/login' || pathname === '/';

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      
      // Force timeout so UI never hangs if Supabase lock is deadlocked
      await Promise.race([
        supabase.auth.signOut(),
        new Promise(resolve => setTimeout(resolve, 2000))
      ]);
      
      const domains = [window.location.hostname, `.${window.location.hostname}`];
      domains.forEach(domain => {
        const cookies = document.cookie.split(";");
        cookies.forEach(cookie => {
          const cookieName = cookie.split("=")[0].trim();
          if (cookieName.startsWith("sb-") || cookieName.startsWith("supabase")) {
            document.cookie = `${cookieName}=; path=/; domain=${domain}; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax; Secure`;
            document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax; Secure`;
          }
        });
      });
      
      window.location.href = '/login';
    } catch (e) {
      console.error("Logout failed", e);
      window.location.href = '/login';
    }
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
    <div className={`flex flex-col gap-3 z-50 w-full ${collapsed ? 'items-center lg:items-start group-hover:items-start' : ''}`}>
      {showBadge && (
        <div className={`flex items-center gap-2 text-emerald-400 text-xs font-semibold bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20 w-fit ${collapsed ? 'hidden lg:flex group-hover:flex' : ''}`}>
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
          <span>Secure Session</span>
        </div>
      )}
      <button 
        onClick={handleLogout} 
        disabled={isLoggingOut}
        title="Logout"
        className={`flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 p-2 lg:px-3 lg:py-2 rounded-lg border border-slate-700 shadow-sm disabled:opacity-50 cursor-pointer w-full ${collapsed ? 'justify-center lg:justify-start group-hover:justify-start group-hover:px-3 group-hover:py-2' : 'justify-start px-3 py-2'}`}
      >
        {isLoggingOut ? <Loader2 size={18} className="animate-spin shrink-0" /> : <LogOut size={18} className="shrink-0" />} 
        <span className={`${collapsed ? 'hidden lg:block group-hover:block whitespace-nowrap' : 'block'}`}>
          {isLoggingOut ? "Logging out..." : "Logout"}
        </span>
      </button>
    </div>
  );
}
