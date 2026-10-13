import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { hasGodModeAccess } from '@/lib/god-mode-auth';

export const dynamic = 'force-dynamic';

export default async function GodModeLayout({ children }: { children: ReactNode }) {
  if (!(await hasGodModeAccess())) notFound();

  return <>{children}</>;
}
