import { getAdminSupabase } from "@/lib/api/admin-db";
import { buildEmailHtml } from "@/lib/email/templates";
import { getAppUrl, sendEmail } from "@/lib/email/resend";

async function getClienteEmail(clienteId: string) {
  const supabase = getAdminSupabase();
  const { data } = await supabase
    .from("clientes")
    .select("email, nome, empresa")
    .eq("id", clienteId)
    .maybeSingle();
  return data;
}

async function getFinanceiroEmails() {
  const supabase = getAdminSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("email")
    .eq("role", "financeiro");
  return (data ?? []).map((p) => p.email).filter(Boolean) as string[];
}

export async function notifyPropostaPronta(propostaId: string, clienteId: string) {
  const cliente = await getClienteEmail(clienteId);
  if (!cliente?.email) return;

  const url = `${getAppUrl()}/proposta/${propostaId}`;
  const nome = cliente.nome ?? "Cliente";

  await sendEmail({
    to: cliente.email,
    subject: "Sua proposta comercial está pronta",
    html: buildEmailHtml({
      title: "Proposta comercial disponível",
      greeting: `Olá, ${nome}!`,
      body: `A proposta comercial da <strong>${cliente.empresa ?? "sua empresa"}</strong> foi preparada e já está disponível para visualização. Acesse o link abaixo para conferir os detalhes, valores e escopo do serviço.`,
      ctaLabel: "Ver proposta",
      ctaUrl: url,
      footerNote: "Caso tenha dúvidas, entre em contato com nossa equipe comercial.",
    }),
  });
}

export async function notifyPropostaAceita(propostaId: string, clienteId: string) {
  const [cliente, financeiroEmails] = await Promise.all([
    getClienteEmail(clienteId),
    getFinanceiroEmails(),
  ]);

  if (financeiroEmails.length === 0) return;

  const empresa = cliente?.empresa ?? "Cliente";
  const url = `${getAppUrl()}/propostas`;

  await sendEmail({
    to: financeiroEmails,
    subject: `Proposta aceita — ${empresa}`,
    html: buildEmailHtml({
      title: "Proposta aceita pelo cliente",
      greeting: "Olá, equipe Financeiro!",
      body: `O cliente <strong>${empresa}</strong> aceitou a proposta comercial. A proposta <strong>#${propostaId.slice(0, 8)}</strong> está pronta para os próximos passos financeiros e geração de contrato.`,
      ctaLabel: "Acessar propostas",
      ctaUrl: url,
    }),
  });
}

export async function notifyContratoProntoAssinatura(contratoId: string, clienteId: string) {
  const cliente = await getClienteEmail(clienteId);
  if (!cliente?.email) return;

  const url = `${getAppUrl()}/contrato/${contratoId}`;
  const nome = cliente.nome ?? "Cliente";

  await sendEmail({
    to: cliente.email,
    subject: "Seu contrato está pronto para assinatura",
    html: buildEmailHtml({
      title: "Contrato disponível para assinatura digital",
      greeting: `Olá, ${nome}!`,
      body: `O contrato de prestação de serviços da <strong>${cliente.empresa ?? "sua empresa"}</strong> foi liberado e está aguardando sua assinatura digital. Clique no botão abaixo para revisar e assinar.`,
      ctaLabel: "Assinar contrato",
      ctaUrl: url,
      footerNote: "A assinatura digital tem validade jurídica conforme a legislação vigente.",
    }),
  });
}

export async function notifyContratoAssinado(contratoId: string, clienteId: string) {
  const [cliente, financeiroEmails] = await Promise.all([
    getClienteEmail(clienteId),
    getFinanceiroEmails(),
  ]);

  const empresa = cliente?.empresa ?? "Cliente";
  const url = `${getAppUrl()}/contrato/${contratoId}`;

  const tasks: Promise<unknown>[] = [];

  if (cliente?.email) {
    tasks.push(
      sendEmail({
        to: cliente.email,
        subject: "Contrato assinado com sucesso",
        html: buildEmailHtml({
          title: "Assinatura confirmada",
          greeting: `Olá, ${cliente.nome ?? "Cliente"}!`,
          body: `Confirmamos a assinatura digital do contrato da <strong>${empresa}</strong>. Bem-vindo(a) à V9nove! Nossa equipe entrará em contato em breve para dar início ao projeto.`,
          ctaLabel: "Ver contrato assinado",
          ctaUrl: url,
        }),
      })
    );
  }

  if (financeiroEmails.length > 0) {
    tasks.push(
      sendEmail({
        to: financeiroEmails,
        subject: `Contrato assinado — ${empresa}`,
        html: buildEmailHtml({
          title: "Novo contrato assinado",
          greeting: "Olá, equipe Financeiro!",
          body: `O cliente <strong>${empresa}</strong> assinou digitalmente o contrato <strong>#${contratoId.slice(0, 8)}</strong>. O processo comercial foi concluído e o cliente está ativo.`,
          ctaLabel: "Ver contrato",
          ctaUrl: url,
        }),
      })
    );
  }

  await Promise.all(tasks);
}
