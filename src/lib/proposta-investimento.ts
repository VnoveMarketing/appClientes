import {
  getSetupDescricao,
  resolvePropostaValoresFinanceiros,
  type PropostaFinanceiraInput,
} from "@/lib/proposta-campos";
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

type PropostaInvestSource = PropostaFinanceiraInput;

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

  const resolved = resolvePropostaValoresFinanceiros(proposta, campos);
  const valores = resolved.valoresBrutos;

  const {
    valorInicialBruto,
    valorInicialFinal,
    valorTotalInformado,
    parcelaFinal: finalMensal,
    parcelaAntesDescontoParcela,
    duracao,
    valorTotalContrato,
    hasSetup,
    hasValorTotalInicial,
    hasMensal,
    isSetupIsento,
  } = resolved;

  const campoSetup = findCampo(campos, "setup");
  const campoMensal =
    findCampo(campos, "mensalidade") ?? findCampo(campos, "valor_parcela");
  const campoValorTotal = findCampo(campos, "valor_total");
  const campoParcelas =
    findCampo(campos, "tempo_recorrencia") ??
    findCampo(campos, "valor_recorrencia") ??
    findCampo(campos, "numero_parcelas");

  const isParcelaPrincipal = campoMensal?.chave === "valor_parcela";
  const duracaoLabel =
    duracao === 0 ? "Prazo indeterminado" : `${duracao} ${duracao === 1 ? "mês" : "meses"}`;

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
      isExempt: isSetupIsento,
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
    let parcelaOriginal: number | undefined;
    let descontoParcelaPct: number | undefined;

    if (proposta.desconto_mensalidade > 0) {
      parcelaOriginal = parcelaAntesDescontoParcela;
      descontoParcelaPct = proposta.desconto_mensalidade;
    }

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
      originalAmount: parcelaOriginal,
      discountPct: descontoParcelaPct,
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
      value: isSetupIsento ? "Isento" : formatCurrency(valorInicialFinal),
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
