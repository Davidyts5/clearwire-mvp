-- V25 MIGRATION: Notification Infrastructure

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,   -- the recipient
  type TEXT NOT NULL,                             -- see NOTIFICATION_TYPES below
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  action_url TEXT,                                -- e.g. '/approve/{wireId}'
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,     -- camelCase keys inside
  related_wire_id UUID REFERENCES wire_requests(id),
  related_vendor_id UUID REFERENCES vendors(id),
  related_invite_id UUID REFERENCES team_invites(id),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_user_priority ON notifications(user_id, priority);
CREATE INDEX idx_notifications_company ON notifications(company_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see only their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can mark their own notifications read" ON notifications
  FOR UPDATE USING (user_id = auth.uid());
