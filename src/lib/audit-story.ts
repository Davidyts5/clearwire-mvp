type Payload = Record<string, unknown>;
export type StoryEvent = {
  action?: string;
  event_payload?: unknown;
  actor?: { full_name?: string | null; role?: string | null } | null;
  wire_id?: string | null;
};

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
function payloadOf(value: unknown): Payload {
  if (typeof value === 'string') {
    try { return payloadOf(JSON.parse(value)); } catch { return {}; }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Payload : {};
}

export function auditCategory(event: StoryEvent): 'WIRE' | 'VENDOR' | 'USER' | 'SYSTEM' {
  const payload = payloadOf(event.event_payload);
  const type = `${event.action || ''} ${text(payload.type)}`;
  if (event.wire_id || type.includes('WIRE') || event.action === 'CREATED' || type.includes('STATE_CHANGED')) return 'WIRE';
  if (type.includes('VENDOR')) return 'VENDOR';
  if (/INVITATION|DEVICE|USER_|PRIVACY/.test(type)) return 'USER';
  return 'SYSTEM';
}

/** Deliberately whitelist human context: never render hashes, bank details or raw JSON. */
export function describeAuditEvent(event: StoryEvent): string {
  const action = event.action || '';
  const p = payloadOf(event.event_payload);
  const actor = text(event.actor?.full_name) || 'User';
  const vendor = text(p.vendor) || text(p.vendor_name) || text(p.vendor_name_snapshot) || 'the vendor';
  const reason = text(p.rejection_reason) || text(p.reason);
  const because = reason ? ` Reason: ${reason}.` : '';

  if (action === 'SYSTEM_SUPPORT_INTERVENTION') {
    const type = text(p.type);
    if (type.includes('FAILED') || p.operation_status === 'failed') return 'ClearWire Support attempted to update this record, but the operation failed.';
    if (type.includes('INSPECTED') || type.includes('VIEWED')) return 'ClearWire Support viewed this record.';
    if (p.operation_status === 'no_change') return 'ClearWire Support reviewed this record; no change was needed.';
    if (p.operation_status === 'requested') return 'ClearWire Support requested a manual update to this record.';
    return 'ClearWire Support manually updated this record.';
  }
  if (action === 'CREATED' || action === 'WIRE_CREATED') return `${actor} requested a wire to ${vendor}.`;
  if (action.startsWith('STATE_CHANGED_TO_') || action === 'STATE_CHANGED') {
    const status = text(p.new_status) || action.replace('STATE_CHANGED_TO_', '').toLowerCase();
    switch (status) {
      case 'approved': return `${actor} approved the wire.${because}`;
      case 'denied': case 'rejected': return `${actor} declined the wire.${because}`;
      case 'frozen': return `${actor} froze the wire for further review.${because}`;
      case 'pending_cfo': return `${actor} sent the wire to the CFO for approval.`;
      case 'pending_controller': return `${actor} sent the wire to the controller for review.`;
      case 'pending_cfo_secondary': return `${actor} sent the wire for a second CFO approval.`;
      case 'cancelled': return `${actor} cancelled the wire.${because}`;
      default: return `${actor} updated the wire's review status.`;
    }
  }
  if (action === 'VENDOR_CALLBACK_VERIFIED') return `${actor} confirmed the vendor details by phone${text(p.contact_name) ? ` with ${text(p.contact_name)}` : ''}.`;
  if (action === 'VENDOR_HISTORY_SNAPSHOT') return 'The system saved a record of the vendor details at this point in time.';
  if (action === 'VENDOR_MASTER_UPDATED') return `${actor} updated the vendor details after wire approval.`;
  if (/VENDOR.*APPROVED/.test(action)) return `${actor} approved the vendor change.${because}`;
  if (/VENDOR.*REJECTED/.test(action)) return `${actor} rejected the vendor change.${because}`;
  if (/VENDOR.*ESCALATED/.test(action)) return `${actor} sent the vendor change to the CFO for review.`;
  if (action === 'VENDOR_CHANGE_REQUESTED') return `${actor} requested a change to the vendor details.`;
  if (action === 'VENDOR_RESTRICTED') return `${actor} restricted payments to this vendor.${because}`;
  if (action.includes('POLICY')) return `${actor} updated the workspace approval policy.`;
  if (action === 'INVITATION_CREATED') return `${actor} invited ${text(p.email) || 'a new team member'} to the workspace.`;
  if (action === 'INVITATION_ACCEPTED') return `${actor} accepted the workspace invitation.`;
  if (action === 'INVITATION_CANCELLED') return `${actor} cancelled a workspace invitation.`;
  if (action === 'INVITATION_RESENT') return `${actor} resent a workspace invitation.`;
  if (action.includes('DEVICE') && action.includes('REVOKED')) return `${actor} revoked a registered device.`;
  if (action.includes('DEVICE') && /REGISTERED|CREATED/.test(action)) return `${actor} registered a security device.`;
  if (action === 'USER_EMAIL_NOTIFICATION_PREFERENCE_CHANGED') return `${actor} updated their email notification preferences.`;
  if (action === 'PRIVACY_DELETION_REQUESTED') return `${actor} requested deletion of their personal data.`;
  if (action.includes('REPORT')) return `${actor} generated a compliance report.`;
  // Future events remain readable without leaking an unreviewed payload.
  return `${actor} recorded an activity on this ${event.wire_id ? 'wire' : 'workspace record'}.`;
}
