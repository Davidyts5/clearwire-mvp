import Link from 'next/link';
import LegalLinks from './LegalLinks';
import { POLICY_UPDATED_ON } from '@/lib/legal';

export default function PolicyDocument({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[70vh] bg-[#f5f4ee] px-5 py-8 text-[#203329] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-col gap-5 border-b border-[#dedfd6] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/" className="text-sm font-semibold tracking-wide text-[#315741] underline decoration-[#9eae9e] underline-offset-4">ClearWire</Link>
            <h1 className="mt-4 font-serif text-4xl tracking-[-0.04em] text-[#203329] sm:text-5xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#59665d]">{description}</p>
            <p className="mt-3 text-sm text-[#59665d]">Version dated {POLICY_UPDATED_ON}</p>
          </div>
          <Link href="/" className="inline-flex min-h-10 items-center justify-center self-start rounded-lg border border-[#cbd1c6] bg-white/70 px-4 py-2 text-sm font-semibold text-[#34483a] transition-colors hover:bg-white sm:self-auto">
            Back to ClearWire
          </Link>
        </header>

        <div className="py-8 sm:py-10">
          <LegalLinks className="mb-8 rounded-lg border border-[#e1e2d9] bg-white/75 p-4" />
          <div className="space-y-8 text-[15px] leading-7 text-[#405046]">{children}</div>
          <div className="mt-10 border-t border-[#dedfd6] pt-6">
            <LegalLinks />
          </div>
        </div>
      </div>
    </div>
  );
}
