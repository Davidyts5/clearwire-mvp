"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Loader2, Menu, X } from "lucide-react";
import { getNavItemsForRole } from "@/config/navigation";
import { createClient } from "@/lib/supabase";
import { Role } from "@/lib/roles";
import SessionManager from "./SessionManager";
import NotificationCenter from "./NotificationCenter";

export default function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAuthRoute = pathname === '/login' || pathname === '/' || pathname.startsWith('/invite') || pathname === '/signup';

  useEffect(() => {
    const supabase = createClient();
    if (isAuthRoute) return;

    const fetchRole = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session) {
          const { data, error: userError } = await supabase.from('users').select('role').eq('id', session.user.id).single();
          if (userError) throw userError;
          if (data) setRole(data.role as Role);
        }
      } catch (err) {
        console.error("Sidebar role fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRole();
  }, [isAuthRoute, pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileMenuOpen]);

  if (isAuthRoute) return null;

  const navItems = role ? getNavItemsForRole(role) : [];

  const NavList = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto overflow-x-hidden">
      {isLoading ? (
        <div className="flex justify-center p-4">
          <Loader2 className="animate-spin text-slate-500" size={24} />
        </div>
      ) : (
        navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`flex items-center lg:justify-start group-hover:justify-start justify-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? "bg-slate-800 text-white shadow-sm" 
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
              } ${!isMobile ? "w-full" : ""}`}
            >
              <Icon size={20} className={`shrink-0 ${isActive ? "text-blue-400" : "text-slate-400"}`} /> 
              <span className={`${!isMobile ? "hidden lg:block group-hover:block whitespace-nowrap overflow-hidden text-ellipsis" : "block"}`}>{item.label}</span>
            </Link>
          );
        })
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Header & Toggle */}
      <div className="md:hidden flex items-center justify-between bg-slate-900 p-4 sticky top-0 z-50 border-b border-slate-800">
        <div className="flex items-center gap-2 font-bold text-lg text-white">
          <ShieldCheck className="text-blue-400" size={24} />
          ClearWire
        </div>
        <div className="flex items-center gap-4">
          <NotificationCenter />
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-slate-300 hover:text-white"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 h-full border-r border-slate-800 animate-in slide-in-from-left">
            <NavList isMobile={true} />
            <div className="p-4 border-t border-slate-800 bg-slate-900/50 mt-auto">
              <SessionManager collapsed={false} showBadge={false} />
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar (Collapsible) */}
      <div className="hidden md:flex flex-col h-screen shrink-0 bg-slate-900 text-slate-300 border-r border-slate-800 transition-all duration-300 w-20 lg:w-64 hover:w-64 group sticky top-0 z-40">
        <div className="p-4 lg:p-6 flex items-center justify-between border-b border-slate-800 overflow-hidden h-[73px] shrink-0 w-full group-hover:w-full lg:w-full">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-white shrink-0 mx-auto lg:mx-0 group-hover:mx-0 transition-all">
            <ShieldCheck className="text-blue-400 shrink-0" size={28} />
            <span className="hidden lg:block group-hover:block whitespace-nowrap">ClearWire</span>
          </div>
          <div className="hidden lg:block group-hover:block ml-auto shrink-0">
            <NotificationCenter />
          </div>
        </div>
        
        <NavList />
        
        <div className="p-4 border-t border-slate-800 overflow-hidden shrink-0 flex flex-col items-center lg:items-start group-hover:items-start w-full">
          <SessionManager collapsed={true} showBadge={false} />
        </div>
      </div>
    </>
  );
}
