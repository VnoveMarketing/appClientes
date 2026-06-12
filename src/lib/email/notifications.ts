import { getAdminSupabase } from "@/lib/api/admin-db";
import { buildEmailHtml, buildEmailText } from "@/lib/email/templates";
import { getAppUrl, sendEmail } from "@/lib/email/resend";

type ClienteContato = {
  email: string;
  nome?: string | null;
  empresa?: string | null;
};

async function getClienteContato(clienteId: string): Promise<ClienteContato | null> {
  const supabase = getAdminSupabase();
  const { data } = await supabase
    .from("clientes")
    .select("email, nome, empresa")
    .eq("id", clienteId)
    .maybeSingle();

  if (!data?.email?.trim()) return null;
  return {
    email: data.email.trim(),
    nome: data.nome,
    empresa: data.empresa,
  };
}

function resolveClienteContato(
  fromDb: ClienteContato | null,
  override?: Partial<ClienteContato>
): ClienteContato | null {
  const email = override?.email?.trim() || fromDb?.email?.trim();
  if (!email) return null;
  return {
    email,
    nome: override?.nome ?? fromDb?.nome,
    empresa: override?.empresa ?? fromDb?.empresa,
  };
}

/** E-mails da equipe interna (financeiro, admin) + NOTIFICATION_EMAILS no .env */
async function getEquipeNotificacaoEmails() {
  const envEmails = (process.env.NOTIFICATION_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("email")
    .in("role", ["financeiro", "admin"]);

  if (error) {
    console.error("[email] Erro ao buscar profiles para notificação:", error.message);
  }

  const profileEmails = (data ?? []).map((p) => p.email).filter(Boolean) as string[];
  return [...new Set([...envEmails, ...profileEmails])];
}

async function dispatchEmail(
  context: string,
  params: Parameters<typeof sendEmail>[0]
) {
  const result = await sendEmail(params);
  if (!result.ok) {
    console.error(`[email] ${context}:`, result.error);
  }
  return result;
}

function buildAndSend(
  context: string,
  to: string,
  subject: string,
  template: Parameters<typeof buildEmailHtml>[0]
) {
  return dispatchEmail(context, {
    to,
    subject,
    html: buildEmailHtml(template),
    text: buildEmailText(template),
  });
}

export async function notifyPropostaPronta(
  propostaId: string,
  clienteId: string,
  override?: Partial<ClienteContato>
) {
  const cliente = resolveClienteContato(await getClienteContato(clienteId), override);
  if (!cliente) {
    console.warn(
      `[email] notifyPropostaPronta: cliente ${clienteId} sem e-mail — notificação ignorada`
    );
    return { ok: false as const, error: "Cliente sem e-mail cadastrado" };
  }

  const url = `${getAppUrl()}/proposta/${propostaId}`;
  const nome = cliente.nome ?? "Cliente";

  return buildAndSend("notifyPropostaPronta", cliente.email, "Sua proposta comercial está pronta", {
    title: "Proposta comercial disponível",
    greeting: `Olá, ${nome}!`,
    body: `A proposta comercial da <strong>${cliente.empresa ?? "sua empresa"}</strong> foi preparada e já está disponível para visualização. Acesse o link abaixo para conferir os detalhes, valores e escopo do serviço.`,
    ctaLabel: "Ver proposta",
    ctaUrl: url,
    footerNote: "Caso tenha dúvidas, entre em contato com nossa equipe comercial.",
  });
}

export async function notifyPropostaAceita(propostaId: string, clienteId: string) {
  const [cliente, equipeEmails] = await Promise.all([
    getClienteContato(clienteId),
    getEquipeNotificacaoEmails(),
  ]);

  if (equipeEmails.length === 0) {
    console.warn(
      "[email] notifyPropostaAceita: nenhum destinatário interno (profiles financeiro/admin ou NOTIFICATION_EMAILS)"
    );
    return;
  }

  const empresa = cliente?.empresa ?? "Cliente";
  const url = `${getAppUrl()}/propostas`;

  await dispatchEmail("notifyPropostaAceita", {
    to: equipeEmails,
    subject: `Proposta aceita — ${empresa}`,
    html: buildEmailHtml({
      title: "Proposta aceita pelo cliente",
      greeting: "Olá, equipe!",
      body: `O cliente <strong>${empresa}</strong> aceitou a proposta comercial. A proposta <strong>#${propostaId.slice(0, 8)}</strong> foi registrada e o contrato está sendo preparado para revisão financeira.`,
      ctaLabel: "Acessar propostas",
      ctaUrl: url,
    }),
    text: buildEmailText({
      title: "Proposta aceita pelo cliente",
      greeting: "Olá, equipe!",
      body: `O cliente ${empresa} aceitou a proposta comercial. A proposta #${propostaId.slice(0, 8)} foi registrada e o contrato está sendo preparado para revisão financeira.`,
      ctaLabel: "Acessar propostas",
      ctaUrl: url,
    }),
  });
}

/** Avisa financeiro que o contrato foi gerado e aguarda revisão/edição */
export async function notifyContratoDisponivelRevisaoFinanceiro(
  contratoId: string,
  clienteId: string
) {
  const [cliente, equipeEmails] = await Promise.all([
    getClienteContato(clienteId),
    getEquipeNotificacaoEmails(),
  ]);

  if (equipeEmails.length === 0) {
    console.warn(
      "[email] notifyContratoDisponivelRevisaoFinanceiro: nenhum destinatário interno"
    );
    return;
  }

  const empresa = cliente?.empresa ?? "Cliente";
  const url = `${getAppUrl()}/contratos`;

  await dispatchEmail("notifyContratoDisponivelRevisaoFinanceiro", {
    to: equipeEmails,
    subject: `Contrato para revisão — ${empresa}`,
    html: buildEmailHtml({
      title: "Contrato disponível para revisão",
      greeting: "Olá, equipe Financeiro!",
      body: `O contrato do cliente <strong>${empresa}</strong> foi gerado automaticamente após a aceitação da proposta e aguarda <strong>revisão e validação</strong> antes do envio ao cliente para assinatura. Contrato <strong>#${contratoId.slice(0, 8)}</strong>.`,
      ctaLabel: "Revisar contratos",
      ctaUrl: url,
    }),
    text: buildEmailText({
      title: "Contrato disponível para revisão",
      greeting: "Olá, equipe Financeiro!",
      body: `O contrato do cliente ${empresa} foi gerado e aguarda revisão antes do envio para assinatura. Contrato #${contratoId.slice(0, 8)}.`,
      ctaLabel: "Revisar contratos",
      ctaUrl: url,
    }),
  });
}

/** Confirmação ao cliente após aceitar a proposta */
export async function notifyPropostaAceitaCliente(
  propostaId: string,
  override: Partial<ClienteContato> & { email?: string }
) {
  const cliente = resolveClienteContato(null, override);
  if (!cliente) {
    console.warn("[email] notifyPropostaAceitaCliente: e-mail do cliente não informado");
    return;
  }

  const url = `${getAppUrl()}/proposta/${propostaId}/sucesso`;

  await buildAndSend(
    "notifyPropostaAceitaCliente",
    cliente.email,
    "Proposta aceita — próximos passos",
    {
      title: "Proposta aceita com sucesso",
      greeting: `Olá, ${cliente.nome ?? "Cliente"}!`,
      body: `Recebemos a aceitação da proposta comercial da <strong>${cliente.empresa ?? "sua empresa"}</strong>. Nossa equipe financeira está preparando o contrato — você receberá um e-mail quando estiver liberado para assinatura digital.`,
      ctaLabel: "Ver confirmação",
      ctaUrl: url,
    }
  );
}

export async function notifyContratoProntoAssinatura(
  contratoId: string,
  clienteId: string,
  override?: Partial<ClienteContato>
) {
  const cliente = resolveClienteContato(await getClienteContato(clienteId), override);
  if (!cliente) {
    console.warn(
      `[email] notifyContratoProntoAssinatura: cliente ${clienteId} sem e-mail — notificação ignorada`
    );
    return { ok: false as const, error: "Cliente sem e-mail cadastrado" };
  }

  const url = `${getAppUrl()}/contrato/${contratoId}`;
  const nome = cliente.nome ?? "Cliente";

  return buildAndSend(
    "notifyContratoProntoAssinatura",
    cliente.email,
    "Seu contrato está pronto para assinatura",
    {
      title: "Contrato disponível para assinatura digital",
      greeting: `Olá, ${nome}!`,
      body: `O contrato de prestação de serviços da <strong>${cliente.empresa ?? "sua empresa"}</strong> foi liberado e está aguardando sua assinatura digital. Clique no botão abaixo para revisar e assinar.`,
      ctaLabel: "Assinar contrato",
      ctaUrl: url,
      footerNote: "A assinatura digital tem validade jurídica conforme a legislação vigente.",
    }
  );
}

export async function notifyContratoAssinado(
  contratoId: string,
  clienteId: string,
  override?: Partial<ClienteContato>
) {
  const [fromDb, equipeEmails] = await Promise.all([
    getClienteContato(clienteId),
    getEquipeNotificacaoEmails(),
  ]);

  const cliente = resolveClienteContato(fromDb, override);
  const empresa = cliente?.empresa ?? fromDb?.empresa ?? "Cliente";
  const url = `${getAppUrl()}/contrato/${contratoId}`;

  const tasks: Promise<unknown>[] = [];

  if (cliente) {
    tasks.push(
      buildAndSend(
        "notifyContratoAssinado:cliente",
        cliente.email,
        "Contrato assinado com sucesso",
        {
          title: "Assinatura confirmada",
          greeting: `Olá, ${cliente.nome ?? "Cliente"}!`,
          body: `Confirmamos a assinatura digital do contrato da <strong>${empresa}</strong>. Bem-vindo(a) à Agência Vnove! Nossa equipe entrará em contato em breve para dar início ao projeto.`,
          ctaLabel: "Ver contrato assinado",
          ctaUrl: url,
        }
      )
    );
  } else {
    console.warn(
      `[email] notifyContratoAssinado: cliente ${clienteId} sem e-mail — confirmação ao cliente ignorada`
    );
  }

  if (equipeEmails.length > 0) {
    tasks.push(
      dispatchEmail("notifyContratoAssinado:equipe", {
        to: equipeEmails,
        subject: `Contrato assinado — ${empresa}`,
        html: buildEmailHtml({
          title: "Novo contrato assinado",
          greeting: "Olá, equipe!",
          body: `O cliente <strong>${empresa}</strong> assinou digitalmente o contrato <strong>#${contratoId.slice(0, 8)}</strong>. O processo comercial foi concluído e o cliente está ativo.`,
          ctaLabel: "Ver contrato",
          ctaUrl: url,
        }),
        text: buildEmailText({
          title: "Novo contrato assinado",
          greeting: "Olá, equipe!",
          body: `O cliente ${empresa} assinou digitalmente o contrato #${contratoId.slice(0, 8)}. O processo comercial foi concluído e o cliente está ativo.`,
          ctaLabel: "Ver contrato",
          ctaUrl: url,
        }),
      })
    );
  } else {
    console.warn(
      "[email] notifyContratoAssinado: nenhum destinatário interno (profiles financeiro/admin ou NOTIFICATION_EMAILS)"
    );
  }

  await Promise.all(tasks);
}
