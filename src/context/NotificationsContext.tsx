"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
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

type NotificationsContextValue = {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string, currentReadState: boolean) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const hasSubscribed = useRef(false);

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

  useEffect(() => {
    if (!userId || hasSubscribed.current) return;
    hasSubscribed.current = true;
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload: any) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
        setUnreadCount(c => c + 1);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      hasSubscribed.current = false;
    };
  }, [userId]);

  const markAsRead = async (id: string, currentReadState: boolean) => {
    if (currentReadState) return;
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
    } catch (err) {
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await fetch(`/api/notifications/mark-all`, { method: 'PATCH' });
    } catch (err) {
      fetchNotifications();
    }
  };

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, refresh: fetchNotifications }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within a NotificationsProvider");
  return ctx;
}
