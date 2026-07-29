import fs from 'fs';

const p = 'src/app/api/audit/reports/generate/route.ts';
let content = fs.readFileSync(p, 'utf8');

content = content.replace('function ensureSpace(needed: number)', 'const ensureSpace = (needed: number) =>');
content = content.replace('function heading(text: string)', 'const heading = (text: string) =>');
content = content.replace('function line(text: string, size = 10, isBold = false)', 'const line = (text: string, size = 10, isBold = false) =>');

fs.writeFileSync(p, content);
