import { Resend } from 'resend';

// Create client lazily or with dummy key to allow Next.js build to pass
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

export async function sendNotificationEmail(params: {
  to: string;
  title: string;
  message: string;
  actionUrl?: string | null;
}) {
  try {
    await resend.emails.send({
      from: 'ClearWire <onboarding@resend.dev>', // swap for a verified domain address later
      to: params.to,
      subject: params.title,
      html: buildEmailHtml(params),
    });
  } catch (err) {
    console.error('Failed to send notification email:', err);
  }
}

function buildEmailHtml({ title, message, actionUrl }: { title: string; message: string; actionUrl?: string | null }) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clearwire-mvp.vercel.app';
  const ctaButton = actionUrl
    ? `<a href="${baseUrl}${actionUrl}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">View in ClearWire</a>`
    : '';
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <div style="background:#0f172a;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;font-weight:700;font-size:18px;">
        ClearWire
      </div>
      <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;padding:24px;">
        <h2 style="margin:0 0 8px;color:#0f172a;font-size:16px;">${title}</h2>
        <p style="margin:0;color:#475569;font-size:14px;line-height:1.5;">${message}</p>
        ${ctaButton}
      </div>
    </div>
  `;
}
