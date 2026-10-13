import { Resend } from 'resend';

// Create the client with a placeholder so local builds do not require a live email key.
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

type NotificationEmailParams = {
  to: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  preferencesUrl?: string | null;
};

export async function sendNotificationEmail(params: NotificationEmailParams) {
  try {
    await resend.emails.send({
      from: 'ClearWire <onboarding@resend.dev>', // Replace with a verified sender before external launch.
      to: params.to,
      subject: params.title,
      html: buildEmailHtml(params),
    });
  } catch (err) {
    console.error('Failed to send notification email:', err);
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character] || character));
}

function getAppUrl(path?: string | null) {
  const baseValue = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://clearwire-mvp.vercel.app';
  try {
    const base = new URL(baseValue);
    const url = new URL(path || '/', base);
    // Email actions should stay on the configured ClearWire origin.
    if (url.origin !== base.origin) return new URL('/', base).toString();
    return url.toString();
  } catch {
    return 'https://clearwire-mvp.vercel.app/';
  }
}

function buildEmailHtml({ title, message, actionUrl, preferencesUrl }: NotificationEmailParams) {
  const ctaButton = actionUrl
    ? `<a href="${escapeHtml(getAppUrl(actionUrl))}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#315741;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Open ClearWire</a>`
    : '';
  const preferences = preferencesUrl
    ? `<p style="margin:18px 0 0;color:#59665d;font-size:12px;line-height:1.5;">To stop these operational email notifications, update your <a href="${escapeHtml(getAppUrl(preferencesUrl))}" style="color:#315741;">email notification preferences</a>.</p>`
    : '<p style="margin:18px 0 0;color:#59665d;font-size:12px;line-height:1.5;">This message relates to a ClearWire workspace action.</p>';

  return `
    <div style="font-family:Arial, sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#203329;">
      <div style="background:#263d31;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;font-weight:700;font-size:18px;">
        ClearWire
      </div>
      <div style="border:1px solid #dfe1d7;border-top:none;border-radius:0 0 8px 8px;padding:24px;background:#fff;">
        <h1 style="margin:0 0 8px;color:#203329;font-size:18px;line-height:1.4;">${escapeHtml(title)}</h1>
        <p style="margin:0;color:#405046;font-size:14px;line-height:1.6;">${escapeHtml(message)}</p>
        ${ctaButton}
        ${preferences}
      </div>
    </div>
  `;
}
