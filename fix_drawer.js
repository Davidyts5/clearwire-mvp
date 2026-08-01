import fs from 'fs';

const path = 'src/components/Sidebar.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Explicitly set the mobile header to h-[73px] so we don't have to guess the padding math
content = content.replace(
  '<div className="md:hidden flex items-center justify-between bg-slate-900 p-4 sticky top-0 z-50 border-b border-slate-800">',
  '<div className="md:hidden flex items-center justify-between bg-slate-900 p-4 h-[73px] sticky top-0 z-50 border-b border-slate-800">'
);

// 2. Push the Mobile Drawer down by [73px]
const oldDrawerOuter = '<div className="md:hidden fixed inset-0 z-40 flex">';
const newDrawerOuter = '<div className="md:hidden fixed top-[73px] inset-x-0 bottom-0 z-40 flex">';
content = content.replace(oldDrawerOuter, newDrawerOuter);

// 3. Push the Backdrop down by [73px]
const oldBackdrop = '<div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>';
const newBackdrop = '<div className="fixed top-[73px] inset-x-0 bottom-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>';
content = content.replace(oldBackdrop, newBackdrop);

fs.writeFileSync(path, content);
console.log("Fixed mobile drawer clipping");
