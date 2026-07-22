import re
import os

files = [
  'src/app/api/auth/devices/[id]/revoke/verify/route.ts',
  'src/app/api/settings/route.ts',
  'src/app/api/team/invites/manage/[id]/route.ts',
  'src/app/api/team/invites/route.ts',
  'src/app/api/vendors/[id]/route.ts',
  'src/app/api/vendors/requests/[reqId]/review/route.ts',
  'src/app/api/wires/[id]/approve/verify/route.ts',
  'src/app/api/wires/route.ts'
]

for fpath in files:
    with open(fpath, 'r') as f:
        content = f.read()

    # We need to manually fix these, regex might be too brittle.
    # Actually, let's just print them to see the exact structure.
    matches = re.findall(r"(await\s+([a-zA-Z0-9_\.]+)\.from\('audit_logs'\)\.insert\(\[\{(.*?)\}\]\);)", content, re.DOTALL)
    if matches:
        print(f"--- {fpath} ---")
        for match in matches:
            print(match[0])
            print()
