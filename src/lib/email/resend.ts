import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail =
  process.env.RESEND_FROM_EMAIL ?? "Agência Vnove CRM <criacao@vnove.com.br>";
const replyTo = process.env.RESEND_REPLY_TO ?? "criacao@vnove.com.br";

let resendClient: Resend | null = null;

function getResendClient() {
  if (!resendApiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(resendApiKey);
  }
  return resendClient;
}

function normalizeRecipients(to: string | string[]) {
  const list = Array.isArray(to) ? to : [to];
  return [...new Set(list.map((e) => e.trim().toLowerCase()).filter(Boolean))];
}

export type SendEmailResult =
  | { ok: true }
  | { ok: false; error: string };

export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<SendEmailResult> {
  const client = getResendClient();
  if (!client) {
    const error = "RESEND_API_KEY não configurada";
    console.warn("[email] RESEND_API_KEY não configurada — e-mail não enviado:", params.subject);
    return { ok: false, error };
  }

  const validRecipients = normalizeRecipients(params.to);
  if (validRecipients.length === 0) {
    return { ok: false, error: "Nenhum destinatário válido" };
  }

  if (fromEmail.includes("onboarding@resend.dev")) {
    console.warn(
      "[email] RESEND_FROM_EMAIL usa domínio de teste (onboarding@resend.dev). " +
        "E-mails a clientes externos não serão entregues. Configure um domínio verificado, ex.: " +
        "RESEND_FROM_EMAIL=Agência Vnove CRM <criacao@vnove.com.br>"
    );
  }

  const { error } = await client.emails.send({
    from: fromEmail,
    to: validRecipients,
    replyTo,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });

  if (error) {
    console.error("[email] Falha ao enviar:", {
      subject: params.subject,
      to: validRecipients,
      from: fromEmail,
      error,
    });
    return { ok: false, error: error.message };
  }

  console.info("[email] Enviado:", params.subject, "→", validRecipients.join(", "));
  return { ok: true };
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
