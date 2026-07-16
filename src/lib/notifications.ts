export const NOTIFICATION_TYPES = {
  WIRE_PENDING_APPROVAL: 'wire_pending_approval',
  WIRE_APPROVED: 'wire_approved',
  WIRE_DENIED: 'wire_denied',
  WIRE_FROZEN: 'wire_frozen',
  VENDOR_FROZEN: 'vendor_frozen',
  VENDOR_CHANGED: 'vendor_changed',
  INVITE_SENT: 'invite_sent',
  INVESTIGATION_ASSIGNED: 'investigation_assigned',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export const NOTIFICATION_TYPE_PRIORITY: Record<NotificationType, Priority> = {
  [NOTIFICATION_TYPES.WIRE_PENDING_APPROVAL]: 'medium',
  [NOTIFICATION_TYPES.WIRE_APPROVED]: 'low',
  [NOTIFICATION_TYPES.WIRE_DENIED]: 'medium',
  [NOTIFICATION_TYPES.WIRE_FROZEN]: 'critical',
  [NOTIFICATION_TYPES.VENDOR_FROZEN]: 'high',
  [NOTIFICATION_TYPES.VENDOR_CHANGED]: 'medium',
  [NOTIFICATION_TYPES.INVITE_SENT]: 'medium',
  [NOTIFICATION_TYPES.INVESTIGATION_ASSIGNED]: 'critical',
};

export async function createNotification(supabase: any, params: {
  companyId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: Priority;
  actionUrl?: string;
  metadata?: Record<string, any>;
  relatedWireId?: string;
  relatedVendorId?: string;
  relatedInviteId?: string;
}) {
  try {
    const { error } = await supabase.from('notifications').insert([{
      company_id: params.companyId,
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      priority: params.priority ?? NOTIFICATION_TYPE_PRIORITY[params.type] ?? 'medium',
      action_url: params.actionUrl ?? null,
      metadata: params.metadata ?? {},
      related_wire_id: params.relatedWireId ?? null,
      related_vendor_id: params.relatedVendorId ?? null,
      related_invite_id: params.relatedInviteId ?? null,
    }]);
    if (error) console.error('Failed to create notification:', error);
  } catch (err) {
    console.error('Exception in createNotification:', err);
  }
}
