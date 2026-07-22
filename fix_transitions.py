import re

# 1. Update src/app/api/wires/[id]/approve/verify/route.ts
with open('src/app/api/wires/[id]/approve/verify/route.ts', 'r') as f:
    content = f.read()

# Add the audit log call right after `if (rpcError) throw new Error(rpcError.message);`
audit_log_call = """
      if (rpcError) throw new Error(rpcError.message);

      await appendAuditLog(adminClient, {
        companyId: auth.companyId,
        wireId: params.id,
        actorId: auth.userId,
        action: 'STATE_CHANGED_TO_' + updatedWire.status.toUpperCase(),
        eventPayload: { crypto_hash: `0x${fidoSignatureHash}`, previous_status: wireData.status, new_status: updatedWire.status }
      });
"""
content = content.replace("if (rpcError) throw new Error(rpcError.message);", audit_log_call)
with open('src/app/api/wires/[id]/approve/verify/route.ts', 'w') as f:
    f.write(content)


# 2. Update src/app/api/wires/[id]/route.ts
with open('src/app/api/wires/[id]/route.ts', 'r') as f:
    content = f.read()

if "import { appendAuditLog } from '@/lib/audit-chain';" not in content:
    content = re.sub(
        r"((?:import.*?\n)+)",
        r"\1import { appendAuditLog } from '@/lib/audit-chain';\n",
        content, count=1
    )

audit_log_call_2 = """
    if (rpcError) throw new Error(rpcError.message);

    await appendAuditLog(adminClient, {
      companyId: auth.companyId,
      wireId: params.id,
      actorId: auth.userId,
      action: 'STATE_CHANGED_TO_' + updatedWire.status.toUpperCase(),
      eventPayload: { 
        rejection_reason: rejection_reason || null, 
        rejection_notes: rejection_notes || null, 
        new_status: updatedWire.status 
      }
    });
"""
content = content.replace("if (rpcError) throw new Error(rpcError.message);", audit_log_call_2)
with open('src/app/api/wires/[id]/route.ts', 'w') as f:
    f.write(content)
