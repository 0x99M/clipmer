import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

// Deliberately not a no-reply address. This email tells the buyer to contact
// support@clipmer.app if their key goes missing, so a reply has to reach a
// human — support@ is a Cloudflare Email Routing address that forwards to the
// support inbox. Sending from no-reply@ dropped those replies silently.
const FROM = () =>
  process.env.RESEND_FROM || "Clipmer Support <support@clipmer.app>";

const REPLY_TO = () => process.env.RESEND_REPLY_TO || "support@clipmer.app";

function renderHtml(licenseKey: string): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <h2 style="color: #E95420; margin-bottom: 24px;">Thank you for purchasing Clipmer Pro!</h2>

      <p style="color: #333; line-height: 1.6;">Your license key is below. Copy it and paste it into <strong>Clipmer &rarr; Settings &rarr; License &rarr; Activate</strong>.</p>

      <div style="background: #f5f5f5; border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin: 24px 0; word-break: break-all; font-family: monospace; font-size: 13px; color: #111;">
        ${licenseKey}
      </div>

      <p style="color: #333; line-height: 1.6;">Keep this email &mdash; it's your proof of purchase. If you lose this email, contact <a href="mailto:support@clipmer.app" style="color: #E95420;">support@clipmer.app</a> and we'll re-issue your key.</p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
      <p style="color: #999; font-size: 12px;">Clipmer &mdash; Secrets-Aware Clipboard Manager for Linux</p>
    </div>
  `;
}

export async function sendLicenseEmail(args: {
  to: string;
  licenseKey: string;
}): Promise<{ ok: boolean; messageId?: string; error?: unknown }> {
  try {
    const { data, error } = await getResend().emails.send({
      from: FROM(),
      replyTo: REPLY_TO(),
      to: args.to,
      subject: "Your Clipmer Pro License Key",
      html: renderHtml(args.licenseKey),
    });
    if (error) return { ok: false, error };
    return { ok: true, messageId: data?.id };
  } catch (err) {
    return { ok: false, error: err };
  }
}
