import { redirect } from 'next/navigation';

// Keep old bookmarks working without mounting the retired client-side screen.
// The destination keeps its existing middleware and API authorization checks.
export default function LegacyCFOPortal() {
  redirect('/cfo-dashboard');
}
