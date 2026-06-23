import { calcDiscountedValue } from "@/lib/contract-builder";
import { enrichCamposValoresComCalculados } from "@/lib/campo-calculado";
import { syncLegacyFinancialFields, getSetupDescricao, resolveValorInicialComDesconto, tipoServicoTemCampoSetup, tipoServicoTemCampoValorTotal } from "@/lib/proposta-campos";
import type { TipoServico, TipoServicoCampo } from "@/lib/tipos-servico";

export type PropostaInvestCard = {
  label: string;
  title: string;
  detail: string;
  amount: number;
  originalAmount?: number;
  discountPct?: number;
  isExempt?: boolean;
  suffix?: string;
};

export type PropostaInvestResumoRow = {
  key: string;
  value: string;
  valueMuted?: string;
};

export type PropostaInvestimentoView = {
  tipoNome: string;
  primaryCard: PropostaInvestCard;
  secondaryCard: PropostaInvestCard | null;
  resumo: PropostaInvestResumoRow[];
  valorTotalContrato: number;
};

type PropostaInvestSource = {
  setup: number;
  mensalidade: number;
  desconto_setup: number;
  desconto_mensalidade: number;
  duracao: number;
  campos_valores?: Record<string, string | number | null> | null;
};

const SETUP_DETAIL =
  "Onboarding, criação de canais, parametrização e treinamento de equipe.";
const RECORRENTE_DETAIL =
  "Atuação diária operacional, gerenciamento de mídias e acompanhamento analítico.";

function findCampo(campos: TipoServicoCampo[], chave: string) {
  return campos.find((c) => c.chave === chave);
}

function getCampoAmount(
  valores: Record<string, string | number | null>,
  chave: string
): number {
  const raw = valores[chave];
  const num = Number(raw ?? 0);
  return Number.isFinite(num) ? num : 0;
}

export function buildPropostaInvestimento(
  proposta: PropostaInvestSource,
  tipoServico?: Pick<TipoServico, "nome" | "descricao" | "campos"> | null
): PropostaInvestimentoView {
  const tipoNome = tipoServico?.nome?.trim() || "Serviço";
  const tipoDescricao = tipoServico?.descricao?.trim() ?? "";
  const campos = [...(tipoServico?.campos ?? [])].sort((a, b) => a.ordem - b.ordem);

  const valores = enrichCamposValoresComCalculados(
    campos,
    proposta.campos_valores ?? {}
  ) as Record<string, string | number | null>;

  const financial = syncLegacyFinancialFields(valores, {
    setup: proposta.setup,
    mensalidade: proposta.mensalidade,
    duracao: proposta.duracao,
  });

  const { valorBruto: valorInicialBruto, valorFinal: valorInicialFinal } =
    resolveValorInicialComDesconto(valores, proposta.desconto_setup, campos, {
      setup: proposta.setup,
      valor_total: financial.valor_total,
    });

  const finalMensal = calcDiscountedValue(
    proposta.mensalidade,
    proposta.desconto_mensalidade
  );

  const duracao =
    proposta.duracao > 0
      ? proposta.duracao
      : Number(valores.numero_parcelas ?? valores.tempo_recorrencia ?? 0);

  const valorTotalInformado = getCampoAmount(valores, "valor_total") || financial.valor_total;
  const temCampoSetup = tipoServicoTemCampoSetup(campos);
  const temCampoValorTotal = tipoServicoTemCampoValorTotal(campos);
  const hasSetup = temCampoSetup && (valorInicialBruto > 0 || proposta.setup > 0);
  const hasValorTotalInicial =
    !temCampoSetup && temCampoValorTotal && valorInicialBruto > 0;
  const hasMensal =
    proposta.mensalidade > 0 ||
    getCampoAmount(valores, "mensalidade") > 0 ||
    getCampoAmount(valores, "valor_parcela") > 0;

  const campoSetup = findCampo(campos, "setup");
  const campoMensal =
    findCampo(campos, "mensalidade") ?? findCampo(campos, "valor_parcela");
  const campoValorTotal = findCampo(campos, "valor_total");
  const campoParcelas =
    findCampo(campos, "numero_parcelas") ?? findCampo(campos, "tempo_recorrencia");

  const isParcelaPrincipal = campoMensal?.chave === "valor_parcela";
  const duracaoLabel =
    duracao === 0 ? "Prazo indeterminado" : `${duracao} ${duracao === 1 ? "mês" : "meses"}`;

  const isContratoComSetupSeparado = hasSetup && hasMensal;
  const isFeeMensal = hasValorTotalInicial && hasMensal;
  const temDesconto =
    proposta.desconto_setup > 0 || proposta.desconto_mensalidade > 0;

  let valorTotalContrato: number;

  if (isContratoComSetupSeparado) {
    // Projeto Único: setup + parcelas (valor_total não inclui o setup).
    valorTotalContrato =
      valorInicialFinal + (duracao > 0 ? finalMensal * duracao : 0);
  } else if (isFeeMensal) {
    // Fee Mensal: valor_total já representa o total do contrato.
    valorTotalContrato = valorInicialFinal;
  } else if (hasMensal && duracao > 0) {
    valorTotalContrato = temDesconto
      ? finalMensal * duracao
      : valorTotalInformado > 0
        ? valorTotalInformado
        : finalMensal * duracao;
  } else if (valorTotalInformado > 0) {
    valorTotalContrato = hasValorTotalInicial ? valorInicialFinal : valorTotalInformado;
  } else {
    valorTotalContrato = valorInicialFinal;
  }

  let secondaryCard: PropostaInvestCard | null = null;

  if (hasSetup) {
    const setupDescricao = getSetupDescricao(valores);
    secondaryCard = {
      label: "Etapa de implantação",
      title: campoSetup?.label ?? "Setup e Configurações",
      detail: setupDescricao || SETUP_DETAIL,
      amount: valorInicialFinal,
      originalAmount: proposta.desconto_setup > 0 ? valorInicialBruto : undefined,
      discountPct: proposta.desconto_setup,
      isExempt: proposta.desconto_setup === 100,
    };
  } else if (hasValorTotalInicial && hasMensal) {
    secondaryCard = {
      label: "Investimento do projeto",
      title: campoValorTotal?.label ?? "Valor Total",
      detail:
        tipoDescricao || "Valor global do projeto conforme escopo e entregáveis acordados.",
      amount: valorInicialFinal,
      originalAmount: proposta.desconto_setup > 0 ? valorInicialBruto : undefined,
      discountPct: proposta.desconto_setup,
      isExempt: proposta.desconto_setup === 100,
    };
  } else if (valorTotalInformado > 0 && hasMensal) {
    secondaryCard = {
      label: "Investimento do projeto",
      title: campoValorTotal?.label ?? "Valor Total",
      detail:
        tipoDescricao || "Valor global do projeto conforme escopo e entregáveis acordados.",
      amount: valorTotalInformado,
    };
  } else {
    const outroCampo = campos.find(
      (c) =>
        c.tipo_campo === "currency" &&
        !["mensalidade", "valor_parcela", "valor_total", "setup"].includes(c.chave) &&
        getCampoAmount(valores, c.chave) > 0
    );
    if (outroCampo) {
      secondaryCard = {
        label: tipoNome,
        title: outroCampo.label,
        detail: tipoDescricao || "Valor referente ao tipo de serviço contratado.",
        amount: getCampoAmount(valores, outroCampo.chave),
      };
    }
  }

  let primaryCard: PropostaInvestCard;

  if (hasMensal) {
    primaryCard = {
      label: isParcelaPrincipal ? "Pagamento parcelado" : "Recorrência mensal",
      title:
        campoMensal?.label ??
        (isParcelaPrincipal ? "Valor da Parcela" : "Mensalidade Operacional"),
      detail:
        isParcelaPrincipal && duracao > 0
          ? `Pagamento em ${duracao} parcelas conforme cronograma do projeto.`
          : RECORRENTE_DETAIL,
      amount: finalMensal,
      originalAmount:
        proposta.desconto_mensalidade > 0 ? proposta.mensalidade : undefined,
      discountPct: proposta.desconto_mensalidade,
      suffix: isParcelaPrincipal ? "/parcela" : "/mês",
    };
  } else if (valorTotalInformado > 0) {
    primaryCard = {
      label: "Investimento",
      title: campoValorTotal?.label ?? "Valor Total",
      detail:
        tipoDescricao || "Valor do projeto conforme escopo e entregáveis acordados.",
      amount: hasValorTotalInicial ? valorInicialFinal : valorTotalInformado,
      originalAmount:
        hasValorTotalInicial && proposta.desconto_setup > 0 ? valorInicialBruto : undefined,
      discountPct: hasValorTotalInicial ? proposta.desconto_setup : undefined,
      isExempt: hasValorTotalInicial && proposta.desconto_setup === 100,
    };
  } else {
    primaryCard = {
      label: "Recorrência mensal",
      title: campoMensal?.label ?? "Mensalidade Operacional",
      detail: RECORRENTE_DETAIL,
      amount: finalMensal,
      originalAmount:
        proposta.desconto_mensalidade > 0 ? proposta.mensalidade : undefined,
      discountPct: proposta.desconto_mensalidade,
      suffix: "/mês",
    };
  }

  const resumo: PropostaInvestResumoRow[] = [];

  if (hasSetup && valorInicialBruto > 0) {
    resumo.push({
      key: "Setup final",
      value: proposta.desconto_setup === 100 ? "Isento" : formatCurrency(valorInicialFinal),
    });
  } else if (hasValorTotalInicial) {
    resumo.push({
      key: campoValorTotal?.label ?? "Valor total",
      value: proposta.desconto_setup === 100 ? "Isento" : formatCurrency(valorInicialFinal),
    });
  }

  if (hasMensal && finalMensal > 0) {
    const labelParcela =
      campoMensal?.label ?? (isParcelaPrincipal ? "Valor da parcela" : "Mensalidade");
    const somaParcelas =
      isParcelaPrincipal && duracao > 0 ? finalMensal * duracao : 0;
    resumo.push({
      key: labelParcela,
      value: formatCurrency(finalMensal),
      valueMuted:
        somaParcelas > 0
          ? ` → soma dos meses ( ${formatCurrency(somaParcelas)} )`
          : undefined,
    });
  }

  if (duracao > 0) {
    resumo.push({
      key: campoParcelas?.label ?? "Duração",
      value: duracaoLabel,
    });
  }

  if (valorTotalContrato > 0) {
    resumo.push({
      key: "Valor total do contrato",
      value: formatCurrency(valorTotalContrato),
    });
  }

  return {
    tipoNome,
    primaryCard,
    secondaryCard,
    resumo,
    valorTotalContrato,
  };
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
