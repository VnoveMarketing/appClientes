import { getAppUrl } from "@/lib/email/resend";
import { AGENCY_LOGO_SRC } from "@/lib/brand";

type EmailTemplateParams = {
  title: string;
  greeting?: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
};

export function buildEmailText({
  title,
  greeting = "Olá,",
  body,
  ctaLabel,
  ctaUrl,
  footerNote,
}: EmailTemplateParams) {
  const plainBody = body.replace(/<[^>]+>/g, "");
  const lines = [title, "", greeting, "", plainBody];
  if (ctaLabel && ctaUrl) {
    lines.push("", `${ctaLabel}: ${ctaUrl}`);
  }
  if (footerNote) {
    lines.push("", footerNote);
  }
  lines.push("", "—", "Agência Vnove · Mensagem automática do sistema");
  return lines.join("\n");
}

export function buildEmailHtml({
  title,
  greeting = "Olá,",
  body,
  ctaLabel,
  ctaUrl,
  footerNote,
}: EmailTemplateParams) {
  const ctaBlock =
    ctaLabel && ctaUrl
      ? `
        <tr>
          <td style="padding: 24px 0 8px;">
            <a href="${ctaUrl}" style="display: inline-block; background-color: #09A3E9; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 8px;">
              ${ctaLabel}
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding-top: 8px; font-size: 12px; color: #71717a; word-break: break-all;">
            Ou acesse: <a href="${ctaUrl}" style="color: #09A3E9;">${ctaUrl}</a>
          </td>
        </tr>
      `
      : "";

  const footerBlock = footerNote
    ? `<p style="margin: 24px 0 0; font-size: 12px; color: #71717a; line-height: 1.5;">${footerNote}</p>`
    : "";

  const logoUrl = `${getAppUrl()}${AGENCY_LOGO_SRC}`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #0B0B0B; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0B0B0B; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #161616; border: 1px solid #27272a; border-radius: 12px; overflow: hidden;">
            <tr>
              <td style="background-color: #0B0B0B; padding: 20px 32px; border-bottom: 1px solid #27272a;">
                <img src="${logoUrl}" alt="Agência Vnove" height="28" style="height: 28px; width: auto; display: block;" />
              </td>
            </tr>
            <tr>
              <td style="padding: 32px;">
                <h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3;">${title}</h1>
                <p style="margin: 0 0 12px; font-size: 14px; color: #d4d4d8; line-height: 1.6;">${greeting}</p>
                <p style="margin: 0; font-size: 14px; color: #a1a1aa; line-height: 1.7;">${body}</p>
                <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
                  ${ctaBlock}
                </table>
                ${footerBlock}
              </td>
            </tr>
            <tr>
              <td style="padding: 16px 32px; border-top: 1px solid #27272a; font-size: 11px; color: #52525b; text-align: center;">
                Agência Vnove · Mensagem automática do sistema
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
