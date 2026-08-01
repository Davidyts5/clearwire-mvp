import fs from 'fs';

const sidebarPath = 'src/components/Sidebar.tsx';
let sbContent = fs.readFileSync(sidebarPath, 'utf8');

const oldHeader = `<div className="p-6 flex items-center justify-between border-b border-slate-800 overflow-hidden h-[73px] shrink-0 w-full group-hover:w-full lg:w-full">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-white shrink-0 mx-auto lg:mx-0 group-hover:mx-0 transition-all">
            <ShieldCheck className="text-blue-400 shrink-0" size={28} />
            <span className="hidden lg:block group-hover:block whitespace-nowrap">ClearWire</span>
          </div>
          <div className="hidden lg:block group-hover:block ml-auto">
            <NotificationCenter />
          </div>
        </div>`;

const newHeader = `<div className="p-4 lg:p-6 flex items-center justify-between border-b border-slate-800 overflow-hidden h-[73px] shrink-0 w-full group-hover:w-full lg:w-full">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-white shrink-0 mx-auto lg:mx-0 group-hover:mx-0 transition-all">
            <ShieldCheck className="text-blue-400 shrink-0" size={28} />
            <span className="hidden lg:block group-hover:block whitespace-nowrap">ClearWire</span>
          </div>
          <div className="hidden lg:block group-hover:block ml-auto shrink-0">
            <NotificationCenter />
          </div>
        </div>`;

sbContent = sbContent.replace(oldHeader, newHeader);

const oldNavClass = 'className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${';
const newNavClass = 'className={`flex items-center lg:justify-start group-hover:justify-start justify-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${';

sbContent = sbContent.replace(oldNavClass, newNavClass);

// We need to fix the alignment so the icon is centered when collapsed, and the text only appears on expand
const oldNavSpan = '<span className={`${!isMobile ? "hidden lg:block group-hover:block whitespace-nowrap" : "block"}`}>{item.label}</span>';
const newNavSpan = '<span className={`${!isMobile ? "hidden lg:block group-hover:block whitespace-nowrap overflow-hidden text-ellipsis" : "block"}`}>{item.label}</span>';

sbContent = sbContent.replace(oldNavSpan, newNavSpan);

// Re-adjust the width logic in the NavLink
const oldNavWrapperClass = '} ${!isMobile ? "lg:w-full group-hover:w-full w-fit mx-auto lg:mx-0 group-hover:mx-0" : ""}`}';
const newNavWrapperClass = '} ${!isMobile ? "w-full" : ""}`}';

sbContent = sbContent.replace(oldNavWrapperClass, newNavWrapperClass);


fs.writeFileSync(sidebarPath, sbContent);
