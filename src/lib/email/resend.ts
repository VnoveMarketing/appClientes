import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "CRM V9nove <onboarding@resend.dev>";

let resendClient: Resend | null = null;

function getResendClient() {
  if (!resendApiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(resendApiKey);
  }
  return resendClient;
}

export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  const client = getResendClient();
  if (!client) {
    console.warn("[email] RESEND_API_KEY não configurada — e-mail não enviado:", params.subject);
    return { ok: false as const, error: "RESEND_API_KEY não configurada" };
  }

  const recipients = Array.isArray(params.to) ? params.to : [params.to];
  const validRecipients = recipients.filter(Boolean);
  if (validRecipients.length === 0) {
    return { ok: false as const, error: "Nenhum destinatário válido" };
  }

  const { error } = await client.emails.send({
    from: fromEmail,
    to: validRecipients,
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    console.error("[email] Falha ao enviar:", error);
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const };
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
