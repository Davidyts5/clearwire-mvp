import Link from 'next/link';

const links = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/cookies', label: 'Cookies' },
  { href: '/privacy/data-request', label: 'Data request' },
  { href: '/third-party-notices', label: 'Third-party notices' },
];

export default function LegalLinks({ className = '' }: { className?: string }) {
  return (
    <nav aria-label="Legal information" className={className}>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="rounded-sm text-[#405046] underline decoration-[#aeb8ad] underline-offset-4 transition-colors hover:text-[#203329]">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
