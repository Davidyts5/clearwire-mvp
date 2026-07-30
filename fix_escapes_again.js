import fs from 'fs';
const path = 'src/app/auditor-dashboard/reports/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Using regex to fix the template strings AGAIN that keep failing to parse as valid JSX. 
// Next.js compiler is extremely picky about these.

content = content.replace(/className=\{\\\`mx-auto \\\$\\{isScanning \? 'text-blue-500 animate-pulse' : 'text-slate-300'\\}\\\`\}/g, "className={`mx-auto ${isScanning ? 'text-blue-500 animate-pulse' : 'text-slate-300'}`}");

content = content.replace(/style=\{\{ width: \\\`\\\$\\{scanProgress\\}%\\\` \}\}/g, "style={{ width: `${scanProgress}%` }}");

content = content.replace(/className=\{\\\`p-6 rounded-xl border flex flex-col items-center text-center \\\$\\{scanResults\?\.isTampered \? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'\\}\\\`\}/g, "className={`p-6 rounded-xl border flex flex-col items-center text-center ${scanResults?.isTampered ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}");

content = content.replace(/className=\{\\\`text-2xl font-bold mb-1 \\\$\\{scanResults\?\.isTampered \? 'text-red-700' : 'text-emerald-700'\\}\\\`\}/g, "className={`text-2xl font-bold mb-1 ${scanResults?.isTampered ? 'text-red-700' : 'text-emerald-700'}`}");

content = content.replace(/className=\{\\\`text-sm \\\$\\{scanResults\?\.isTampered \? 'text-red-600' : 'text-emerald-600'\\}\\\`\}/g, "className={`text-sm ${scanResults?.isTampered ? 'text-red-600' : 'text-emerald-600'}`}");


fs.writeFileSync(path, content);
