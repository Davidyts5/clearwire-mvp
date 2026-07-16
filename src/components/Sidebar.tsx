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

  const isAuthRoute = pathname === '/login' || pathname === '/' || pathname.startsWith('/invite');

  useEffect(() => {
    const supabase = createClient();
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
    return () => {
      document.body.style.overflow = 'unset';
    };
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
              title={!isMobile ? item.label : undefined}
              className={`flex items-center gap-3 p-2.5 rounded-lg transition-all font-medium ${
                isActive 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                  : 'hover:bg-slate-800 hover:text-white border border-transparent'
              } ${!isMobile ? 'justify-center lg:justify-start group-hover:justify-start' : 'justify-start'}`}
            >
              <Icon size={20} className={`shrink-0 ${isActive ? "text-blue-400" : "text-slate-400"}`} /> 
              <span className={`${!isMobile ? 'hidden lg:block group-hover:block whitespace-nowrap' : 'block'} text-sm`}>
                {item.label}
              </span>
            </Link>
          );
        })
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Top Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-300 hover:text-white transition-colors">
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <ShieldCheck className="text-blue-400" size={24} />
            <span>ClearWire</span>
          </div>
        </div>
        <div className="flex items-center gap-3"><NotificationCenter /></div>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative flex flex-col w-72 max-w-[85%] h-full bg-slate-900 text-slate-300 animate-in slide-in-from-left duration-300 shadow-2xl">
            <div className="p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-white">
                <ShieldCheck className="text-blue-400" size={28} />
                <span>ClearWire</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X size={20} />
              </button>
            </div>
            
            <NavList isMobile={true} />
            
            <div className="p-5 border-t border-slate-800">
               <SessionManager showBadge={true} collapsed={false} />
            </div>
          </div>
        </div>
      )}

      {/* Desktop & Tablet Sidebar */}
      <div className="hidden md:flex flex-col h-screen shrink-0 bg-slate-900 text-slate-300 border-r border-slate-800 transition-all duration-300 w-20 lg:w-64 hover:w-64 group sticky top-0 z-40">
        <div className="p-6 flex items-center gap-2 font-bold text-xl tracking-tight text-white border-b border-slate-800 overflow-hidden h-[73px] shrink-0 justify-center lg:justify-start group-hover:justify-start">
          <ShieldCheck className="text-blue-400 shrink-0" size={28} />
          <span className="hidden lg:block group-hover:block whitespace-nowrap">ClearWire</span>
        </div>
        
        <NavList isMobile={false} />
        
        <div className="p-4 border-t border-slate-800 overflow-hidden shrink-0 flex flex-col items-center lg:items-start group-hover:items-start w-full">
           <div className="w-full flex justify-center lg:justify-start group-hover:justify-start mb-4 px-2"><NotificationCenter /></div>
           <SessionManager showBadge={true} collapsed={true} />
        </div>
      </div>
    </>
  );
}
