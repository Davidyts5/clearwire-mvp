import re

def fix_file(path):
    with open(path, 'r') as f:
        content = f.read()
    
    if "import { appendAuditLog } from '@/lib/audit-chain';" not in content and "'audit_logs'" in content:
        # Add import after other imports
        content = re.sub(
            r"((?:import.*?\n)+)",
            r"\1import { appendAuditLog } from '@/lib/audit-chain';\n",
            content, count=1
        )

    # 1. src/app/api/auth/devices/[id]/revoke/verify/route.ts
    content = content.replace("""await adminClient.from('audit_logs').insert([{
      company_id: auth.companyId,
      wire_id: '00000000-0000-0000-0000-000000000000',
      actor_id: auth.userId,
      action: 'DEVICE_REVOKED',
      new_hash: params.id,
      previous_hash: device.device_name
    }]);""", """await appendAuditLog(adminClient, {
      companyId: auth.companyId,
      wireId: '00000000-0000-0000-0000-000000000000',
      actorId: auth.userId,
      action: 'DEVICE_REVOKED',
      eventPayload: { device_id: params.id, device_name: device.device_name }
    });""")

    # 2. src/app/api/settings/route.ts
    content = content.replace("""await auth.supabase.from('audit_logs').insert([{
        company_id: auth.companyId,
        wire_id: '00000000-0000-0000-0000-000000000000',
        actor_id: auth.userId,
        action: 'POLICY_VENDOR_AUTH_CHANGED',
        previous_hash: oldSettings.vendor_auth_policy || 'controller_any',
        new_hash: body.vendor_auth_policy
      }]);""", """await appendAuditLog(auth.supabase, {
        companyId: auth.companyId,
        wireId: '00000000-0000-0000-0000-000000000000',
        actorId: auth.userId,
        action: 'POLICY_VENDOR_AUTH_CHANGED',
        eventPayload: { previous_policy: oldSettings.vendor_auth_policy || 'controller_any', new_policy: body.vendor_auth_policy }
      });""")

    # 3. src/app/api/team/invites/manage/[id]/route.ts
    content = content.replace("""await adminClient.from('audit_logs').insert([{
      company_id: auth.companyId,
      wire_id: '00000000-0000-0000-0000-000000000000',
      actor_id: auth.userId,
      action: 'INVITATION_CANCELLED',
      new_hash: params.id,
      previous_hash: invite.email
    }]);""", """await appendAuditLog(adminClient, {
      companyId: auth.companyId,
      wireId: '00000000-0000-0000-0000-000000000000',
      actorId: auth.userId,
      action: 'INVITATION_CANCELLED',
      eventPayload: { invite_id: params.id, email: invite.email }
    });""")

    content = content.replace("""await adminClient.from('audit_logs').insert([{
      company_id: auth.companyId,
      wire_id: '00000000-0000-0000-0000-000000000000',
      actor_id: auth.userId,
      action: 'INVITATION_RESENT',
      new_hash: params.id,
      previous_hash: invite.email
    }]);""", """await appendAuditLog(adminClient, {
      companyId: auth.companyId,
      wireId: '00000000-0000-0000-0000-000000000000',
      actorId: auth.userId,
      action: 'INVITATION_RESENT',
      eventPayload: { invite_id: params.id, email: invite.email }
    });""")

    # 4. src/app/api/team/invites/route.ts
    content = content.replace("""await adminClient.from('audit_logs').insert([{
      company_id: auth.companyId,
      wire_id: '00000000-0000-0000-0000-000000000000',
      actor_id: auth.userId,
      action: 'INVITATION_CREATED',
      new_hash: invite.id,
      previous_hash: parsed.email
    }]);""", """await appendAuditLog(adminClient, {
      companyId: auth.companyId,
      wireId: '00000000-0000-0000-0000-000000000000',
      actorId: auth.userId,
      action: 'INVITATION_CREATED',
      eventPayload: { invite_id: invite.id, email: parsed.email }
    });""")

    # 5. src/app/api/vendors/[id]/route.ts
    content = content.replace("""await auth.supabase.from('audit_logs').insert([{
      company_id: auth.companyId, wire_id: '00000000-0000-0000-0000-000000000000', actor_id: auth.userId, action: 'VENDOR_CHANGE_REQUESTED', new_hash: 'SYSTEM'
    }]);""", """await appendAuditLog(auth.supabase, {
      companyId: auth.companyId, wireId: '00000000-0000-0000-0000-000000000000', actorId: auth.userId, action: 'VENDOR_CHANGE_REQUESTED', eventPayload: { vendor_id: params.id }
    });""")

    # 6. src/app/api/vendors/requests/[reqId]/review/route.ts
    content = content.replace("""await auth.supabase.from('audit_logs').insert([{
      company_id: auth.companyId, wire_id: '00000000-0000-0000-0000-000000000000', actor_id: auth.userId, action: `VENDOR_CHANGE_${historyAction}`, new_hash: 'SYSTEM'
    }]);""", """await appendAuditLog(auth.supabase, {
      companyId: auth.companyId, wireId: '00000000-0000-0000-0000-000000000000', actorId: auth.userId, action: `VENDOR_CHANGE_${historyAction}`, eventPayload: { request_id: params.reqId }
    });""")

    content = content.replace("""await auth.supabase.from('audit_logs').insert([{
        company_id: auth.companyId, wire_id: '00000000-0000-0000-0000-000000000000', actor_id: auth.userId, action: 'VENDOR_RESTRICTED', new_hash: 'SYSTEM'
      }]);""", """await appendAuditLog(auth.supabase, {
        companyId: auth.companyId, wireId: '00000000-0000-0000-0000-000000000000', actorId: auth.userId, action: 'VENDOR_RESTRICTED', eventPayload: { vendor_id: reqData.vendor_id }
      });""")

    # 7. src/app/api/wires/[id]/approve/verify/route.ts
    content = content.replace("""await adminClient.from('audit_logs').insert([{
            company_id: auth.companyId,
            wire_id: params.id,
            actor_id: auth.userId,
            action: 'VENDOR_MASTER_UPDATED',
            new_hash: `0x${fidoSignatureHash}`
          }]);""", """await appendAuditLog(adminClient, {
            companyId: auth.companyId,
            wireId: params.id,
            actorId: auth.userId,
            action: 'VENDOR_MASTER_UPDATED',
            eventPayload: { vendor_id: wireData.vendor_id, crypto_hash: `0x${fidoSignatureHash}` }
          });""")

    # 8. src/app/api/wires/route.ts
    content = content.replace("""await auth.supabase.from('audit_logs').insert([{
      company_id: auth.companyId, wire_id: requestData.id, actor_id: auth.userId, action: 'CREATED', new_hash: 'INITIAL_STATE'
    }]);""", """await appendAuditLog(auth.supabase, {
      companyId: auth.companyId, wireId: requestData.id, actorId: auth.userId, action: 'CREATED', eventPayload: { amount: parsed.amount, vendor: vendorTrimmed }
    });""")
    
    with open(path, 'w') as f:
        f.write(content)

for p in [
  'src/app/api/auth/devices/[id]/revoke/verify/route.ts',
  'src/app/api/settings/route.ts',
  'src/app/api/team/invites/manage/[id]/route.ts',
  'src/app/api/team/invites/route.ts',
  'src/app/api/vendors/[id]/route.ts',
  'src/app/api/vendors/requests/[reqId]/review/route.ts',
  'src/app/api/wires/[id]/approve/verify/route.ts',
  'src/app/api/wires/route.ts'
]:
    fix_file(p)
