"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Loader2 } from "lucide-react";
import { getNavItemsForRole } from "@/config/navigation";
import { supabase } from "@/lib/supabase";
import { Role } from "@/lib/roles";
import SessionManager from "./SessionManager";

export default function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthRoute = pathname === '/login' || pathname === '/' || pathname.startsWith('/invite');

  useEffect(() => {
    if (isAuthRoute) return;

    const fetchRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data } = await supabase.from('users').select('role').eq('id', session.user.id).single();
          if (data) setRole(data.role as Role);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRole();
  }, [isAuthRoute, pathname]);

  if (isAuthRoute) return null;

  const navItems = role ? getNavItemsForRole(role) : [];

  return (
    <>
      {/* Mobile Header (Shown on small screens) */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <ShieldCheck className="text-blue-400" size={24} />
          <span>ClearWire</span>
        </div>
        <SessionManager />
      </div>

      {/* Desktop Sidebar (Hidden on small screens) */}
      <div className="hidden md:flex w-64 bg-slate-900 text-slate-300 flex-col min-h-screen shrink-0 border-r border-slate-800">
        <div className="p-6 flex items-center gap-2 font-bold text-xl tracking-tight text-white border-b border-slate-800">
          <ShieldCheck className="text-blue-400" size={28} />
          <span>ClearWire</span>
        </div>
        
        <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="animate-spin text-slate-500" size={24} />
            </div>
          ) : (
            navItems.map((item) => {
              const Icon = item.icon;
              // Precise active state handling
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              
              return (
                <Link 
                  key={item.href} 
                  href={item.href} 
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium ${
                    isActive 
                      ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                      : 'hover:bg-slate-800 hover:text-white border border-transparent'
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-blue-400" : "text-slate-400"} /> 
                  {item.label}
                </Link>
              );
            })
          )}
        </div>
        
        <div className="p-4 border-t border-slate-800">
           <SessionManager />
        </div>
      </div>
    </>
  );
}
