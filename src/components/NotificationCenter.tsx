"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check, Trash2, ShieldAlert, ShieldCheck, Mail, Briefcase, Activity, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  action_url: string | null;
  metadata: Record<string, any>;
  is_read: boolean;
  created_at: string;
};

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications?unreadOnly=false`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data.notifications || []);
        setUnreadCount(json.data.unreadCount || 0);
      }
    } catch (err) {}
  };

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUserId(session.user.id);
      await fetchNotifications();
    };
    init();
  }, []);

  // Set up Supabase Realtime
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
        setUnreadCount(c => c + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const markAsRead = async (id: string, currentReadState: boolean) => {
    if (currentReadState) return;
    
    // Optimistic UI update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));

    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
    } catch (err) {
      // Revert if failed
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    
    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      await fetch(`/api/notifications/mark-all`, { method: 'PATCH' });
    } catch (err) {
      fetchNotifications();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-l-red-500 bg-red-50/50';
      case 'high': return 'border-l-amber-500 bg-amber-50/50';
      case 'medium': return 'border-l-blue-500 bg-blue-50/50';
      default: return 'border-l-slate-300 bg-slate-50/50';
    }
  };

  const getIcon = (type: string, priority: string) => {
    if (priority === 'critical' || priority === 'high') return <AlertTriangle size={18} className="text-amber-500" />;
    if (type.includes('wire')) return <Activity size={18} className="text-blue-500" />;
    if (type.includes('vendor')) return <ShieldCheck size={18} className="text-emerald-500" />;
    if (type.includes('invite')) return <Mail size={18} className="text-purple-500" />;
    return <Bell size={18} className="text-slate-500" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-slate-900"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              Notifications 
              {unreadCount > 0 && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{unreadCount} new</span>}
            </h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                <Check size={12}/> Mark all read
              </button>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Bell size={32} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">No notifications yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map(n => (
                  <li key={n.id} className={`relative border-l-4 ${!n.is_read ? getPriorityColor(n.priority) : 'border-l-transparent bg-white'} hover:bg-slate-50 transition-colors`}>
                    <div className="p-4">
                      {n.action_url ? (
                        <Link href={n.action_url} onClick={() => { markAsRead(n.id, n.is_read); setIsOpen(false); }} className="block">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 shrink-0">{getIcon(n.type, n.priority)}</div>
                            <div>
                              <h4 className={`text-sm ${!n.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>{n.title}</h4>
                              <p className="text-xs text-slate-600 mt-1 line-clamp-2">{n.message}</p>
                              <span className="text-[10px] text-slate-400 mt-2 block font-mono">{new Date(n.created_at).toLocaleString()}</span>
                            </div>
                          </div>
                        </Link>
                      ) : (
                        <div className="flex items-start gap-3" onClick={() => markAsRead(n.id, n.is_read)}>
                          <div className="mt-0.5 shrink-0">{getIcon(n.type, n.priority)}</div>
                          <div>
                            <h4 className={`text-sm ${!n.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>{n.title}</h4>
                            <p className="text-xs text-slate-600 mt-1 line-clamp-2">{n.message}</p>
                            <span className="text-[10px] text-slate-400 mt-2 block font-mono">{new Date(n.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    {!n.is_read && (
                      <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); markAsRead(n.id, n.is_read); }}
                        className="absolute top-4 right-4 text-slate-400 hover:text-blue-600"
                        title="Mark as read"
                      >
                        <span className="w-2 h-2 rounded-full bg-blue-500 block"></span>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
