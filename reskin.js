import fs from 'fs';

function re_skin(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Font family imports
    content = content.replace(/Fraunces/g, 'Space_Grotesk');
    content = content.replace(/space_grotesk/gi, 'spaceGrotesk');
    content = content.replace(/const fraunces = Space_Grotesk\({ subsets: \["latin"\], weight: \["600", "700"\] }\);/, 'const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] });');
    content = content.replace(/fraunces\.className/g, 'spaceGrotesk.className');

    // Colors mapping
    content = content.replace(/bg-ink/g, 'bg-graphite');
    content = content.replace(/text-ink/g, 'text-graphite');
    content = content.replace(/border-ink/g, 'border-graphite');
    content = content.replace(/bg-\[\#1B1A17\]/g, 'bg-graphite');
    content = content.replace(/text-\[\#1B1A17\]/g, 'text-graphite');
    content = content.replace(/border-\[\#1B1A17\]/g, 'border-graphite');

    content = content.replace(/bg-panel/g, 'bg-panel');
    content = content.replace(/text-panel/g, 'text-panel');
    content = content.replace(/border-panel/g, 'border-panel');
    content = content.replace(/bg-\[\#23221E\]/g, 'bg-panel');
    content = content.replace(/text-\[\#23221E\]/g, 'text-panel');
    content = content.replace(/border-\[\#23221E\]/g, 'border-panel');

    content = content.replace(/bg-parchment/g, 'bg-steel');
    content = content.replace(/text-parchment/g, 'text-steel');
    content = content.replace(/border-parchment/g, 'border-steel');
    content = content.replace(/bg-\[\#EDE8DE\]/g, 'bg-steel');
    content = content.replace(/text-\[\#EDE8DE\]/g, 'text-steel');
    content = content.replace(/border-\[\#EDE8DE\]/g, 'border-steel');

    content = content.replace(/bg-muted/g, 'bg-slate');
    content = content.replace(/text-muted/g, 'text-slate');
    content = content.replace(/border-muted/g, 'border-slate');
    content = content.replace(/placeholder-muted/g, 'placeholder-slate');
    content = content.replace(/bg-\[\#A8A296\]/g, 'bg-slate');
    content = content.replace(/text-\[\#A8A296\]/g, 'text-slate');
    content = content.replace(/border-\[\#A8A296\]/g, 'border-slate');

    // Wax mapping
    content = content.replace(/bg-wax/g, 'bg-signal-red');
    content = content.replace(/text-wax/g, 'text-signal-red');
    content = content.replace(/border-wax/g, 'border-signal-red');
    content = content.replace(/bg-\[\#A63A2E\]/g, 'bg-signal-red');
    content = content.replace(/text-\[\#A63A2E\]/g, 'text-signal-red');
    content = content.replace(/border-\[\#A63A2E\]/g, 'border-signal-red');

    // Verified mapping
    content = content.replace(/bg-verified/g, 'bg-signal-green');
    content = content.replace(/text-verified/g, 'text-signal-green');
    content = content.replace(/border-verified/g, 'border-signal-green');
    content = content.replace(/bg-\[\#4E7A64\]/g, 'bg-signal-green');
    content = content.replace(/text-\[\#4E7A64\]/g, 'text-signal-green');
    content = content.replace(/border-\[\#4E7A64\]/g, 'border-signal-green');

    // Brass Mapping (Requires splitting between `line` for borders and `wire` for text/bg links)
    // First, map generic hex to token format
    content = content.replace(/bg-\[\#B08D57\]/g, 'bg-brass');
    content = content.replace(/text-\[\#B08D57\]/g, 'text-brass');
    content = content.replace(/border-\[\#B08D57\]/g, 'border-brass');
    content = content.replace(/ring-\[\#B08D57\]/g, 'ring-brass');

    // Now remap brass token to line/wire contextually
    // Borders/Hairlines/Dividers -> line
    content = content.replace(/border-brass/g, 'border-line');
    content = content.replace(/bg-brass\/40 z-0/g, 'bg-line/40 z-0');
    content = content.replace(/bg-brass\/30/g, 'bg-line/30');

    // Interactive/Accents/Text -> wire
    content = content.replace(/text-brass/g, 'text-wire');
    content = content.replace(/bg-brass/g, 'bg-wire');
    content = content.replace(/hover:bg-brass/g, 'hover:bg-wire');
    content = content.replace(/hover:text-brass/g, 'hover:text-wire');
    content = content.replace(/focus:border-brass/g, 'focus:border-wire');
    content = content.replace(/focus:ring-brass/g, 'focus:ring-wire');
    content = content.replace(/selection:bg-brass/g, 'selection:bg-wire');

    // Fix padding reductions on Landing Page
    if (filePath.includes('page.tsx') && !filePath.includes('login') && !filePath.includes('signup')) {
        content = content.replace(/py-24/g, 'py-20');
        content = content.replace(/py-16/g, 'py-12');
        content = content.replace(/py-32/g, 'py-24');
    }

    fs.writeFileSync(filePath, content);
}

re_skin('src/app/page.tsx');
re_skin('src/app/login/page.tsx');
re_skin('src/app/signup/page.tsx');

console.log("Tokens swapped!");
