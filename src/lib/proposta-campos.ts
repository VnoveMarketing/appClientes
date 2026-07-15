import { enrichCamposValoresComCalculados } from "@/lib/campo-calculado";
import type { TipoServicoCampo } from "@/lib/tipos-servico";

type CamposValores = Record<string, string | number | null | undefined>;

export const SETUP_DESCRICAO_CHAVE = "setup_descricao";

export type ValorInicialAlvo = "setup" | "valor_total";

export function tipoServicoTemCampoSetup(campos?: { chave: string }[]) {
  return (campos ?? []).some((c) => c.chave === "setup");
}

export function tipoServicoTemCampoValorTotal(campos?: { chave: string }[]) {
  return (campos ?? []).some((c) => c.chave === "valor_total");
}

export function getDescontoInicialLabel(campos?: { chave: string }[]) {
  if (tipoServicoTemCampoSetup(campos)) return "Desconto no setup (%)";
  if (tipoServicoTemCampoValorTotal(campos)) return "Desconto no valor total (%)";
  return "Desconto no valor inicial (%)";
}

export function getDescontoMensalidadeLabel(campos?: { chave: string }[]) {
  const temParcela = (campos ?? []).some((c) => c.chave === "valor_parcela");
  const temMensalidade = (campos ?? []).some((c) => c.chave === "mensalidade");
  if (temParcela && !temMensalidade) return "Desconto na parcela (%)";
  if (temMensalidade) return "Desconto na mensalidade (%)";
  return "Desconto na recorrência (%)";
}

export function applyDescontoPercent(valor: number, pct: number): number {
  if (!Number.isFinite(valor) || pct <= 0) return valor;
  return valor - (valor * pct) / 100;
}

/** Valor único ao qual se aplica desconto_setup: campo setup ou valor_total (conforme o tipo). */
export function resolveValorInicialBruto(
  camposValores: CamposValores,
  campos?: { chave: string }[],
  legacy?: { setup?: number; valor_total?: number }
): { valor: number; alvo: ValorInicialAlvo | null } {
  if (tipoServicoTemCampoSetup(campos)) {
    const valor = Number(camposValores.setup ?? legacy?.setup ?? 0);
    return { valor: Number.isFinite(valor) ? valor : 0, alvo: "setup" };
  }

  if (tipoServicoTemCampoValorTotal(campos)) {
    const valor = Number(camposValores.valor_total ?? legacy?.valor_total ?? 0);
    return { valor: Number.isFinite(valor) ? valor : 0, alvo: "valor_total" };
  }

  const setupLegacy = Number(legacy?.setup ?? camposValores.setup ?? 0);
  if (setupLegacy > 0) {
    return { valor: setupLegacy, alvo: "setup" };
  }

  const valorTotal = Number(camposValores.valor_total ?? legacy?.valor_total ?? 0);
  if (valorTotal > 0) {
    return { valor: valorTotal, alvo: "valor_total" };
  }

  return { valor: 0, alvo: null };
}

export function resolveValorInicialComDesconto(
  camposValores: CamposValores,
  descontoSetup: number,
  campos?: { chave: string }[],
  legacy?: { setup?: number; valor_total?: number }
) {
  const { valor, alvo } = resolveValorInicialBruto(camposValores, campos, legacy);
  return {
    valorBruto: valor,
    valorFinal: valor - (valor * descontoSetup) / 100,
    alvo,
  };
}

export function getSetupDescricao(camposValores?: CamposValores | null): string {
  const raw = camposValores?.[SETUP_DESCRICAO_CHAVE];
  if (raw === null || raw === undefined) return "";
  return String(raw).trim();
}

const CHAVES_DURACAO = ["tempo_recorrencia", "valor_recorrencia", "numero_parcelas"] as const;

export function resolveDuracaoMeses(
  camposValores: CamposValores,
  fallbackDuracao?: number
): number {
  const c = camposValores ?? {};

  for (const chave of CHAVES_DURACAO) {
    const valor = Number(c[chave] ?? 0);
    if (Number.isFinite(valor) && valor > 0) return valor;
  }

  if (fallbackDuracao && fallbackDuracao > 0) return fallbackDuracao;
  return 0;
}

export function resolveValorParcelaExibicao(params: {
  campos?: { chave: string; tipo_campo: string }[];
  valores: CamposValores;
  duracao: number;
  valorTotalBruto: number;
  valorTotalFinal: number;
  descontoSetup: number;
  descontoMensalidade: number;
  mensalidadeLegacy: number;
}): { valor: number; valorBruto: number; valorAntesDescontoParcela: number } {
  const campoParcela = (params.campos ?? []).find((c) => c.chave === "valor_parcela");
  const isCalculated = campoParcela?.tipo_campo === "calculated";
  const temValorTotal = tipoServicoTemCampoValorTotal(params.campos);

  const brutoParcela =
    params.mensalidadeLegacy > 0
      ? params.mensalidadeLegacy
      : Number(params.valores.valor_parcela ?? params.valores.mensalidade ?? 0);

  const parcelaBrutaCalculada =
    isCalculated && params.duracao > 0 && params.valorTotalBruto > 0
      ? params.valorTotalBruto / params.duracao
      : Number.isFinite(brutoParcela)
        ? brutoParcela
        : 0;

  const descontoNoValorTotal =
    params.descontoSetup > 0 && params.valorTotalBruto > 0 && temValorTotal;

  let parcelaAposDescontoTotal = parcelaBrutaCalculada;

  if (descontoNoValorTotal) {
    if (isCalculated && params.duracao > 0 && params.valorTotalFinal > 0) {
      parcelaAposDescontoTotal = params.valorTotalFinal / params.duracao;
    } else if (parcelaBrutaCalculada > 0) {
      parcelaAposDescontoTotal =
        parcelaBrutaCalculada * (params.valorTotalFinal / params.valorTotalBruto);
    }
  }

  const parcelaFinal = applyDescontoPercent(
    parcelaAposDescontoTotal,
    params.descontoMensalidade
  );

  return {
    valor: parcelaFinal,
    valorBruto: parcelaBrutaCalculada,
    valorAntesDescontoParcela: parcelaAposDescontoTotal,
  };
}

export function syncLegacyFinancialFields(
  camposValores: CamposValores,
  overrides?: {
    setup?: number;
    mensalidade?: number;
    duracao?: number;
  }
) {
  const c = camposValores ?? {};

  const setup = overrides?.setup ?? Number(c.setup ?? 0);
  const mensalidade =
    overrides?.mensalidade ?? Number(c.mensalidade ?? c.valor_parcela ?? c.valor ?? 0);
  const duracao =
    overrides?.duracao !== undefined
      ? overrides.duracao
      : resolveDuracaoMeses(c);
  const valorTotal = Number(c.valor_total ?? 0);

  return {
    setup: Number.isFinite(setup) ? setup : 0,
    mensalidade: Number.isFinite(mensalidade) ? mensalidade : 0,
    duracao: Number.isFinite(duracao) ? duracao : 0,
    valor_total: Number.isFinite(valorTotal) ? valorTotal : 0,
  };
}

export type PropostaFinanceiraInput = {
  setup: number;
  mensalidade: number;
  desconto_setup: number;
  desconto_mensalidade: number;
  duracao: number;
  campos_valores?: Record<string, string | number | null> | null;
};

export type PropostaValoresResolvidos = {
  valoresBrutos: Record<string, string | number | null>;
  valoresExibicao: Record<string, string | number | null>;
  valorInicialBruto: number;
  valorInicialFinal: number;
  valorTotalInformado: number;
  parcelaBruta: number;
  parcelaFinal: number;
  parcelaAntesDescontoParcela: number;
  duracao: number;
  valorTotalContrato: number;
  valorFinalSetup: number;
  valorFinalMensal: number;
  hasSetup: boolean;
  hasValorTotalInicial: boolean;
  hasMensal: boolean;
  isSetupIsento: boolean;
};

function getCampoAmount(valores: Record<string, string | number | null>, chave: string): number {
  const num = Number(valores[chave] ?? 0);
  return Number.isFinite(num) ? num : 0;
}

/** Fonte única de verdade para valores financeiros com descontos aplicados. */
export function resolvePropostaValoresFinanceiros(
  proposta: PropostaFinanceiraInput,
  campos?: Array<{ chave: string; tipo_campo: string }>
): PropostaValoresResolvidos {
  const camposList = campos ?? [];
  const valoresBrutos = enrichCamposValoresComCalculados(
    camposList as TipoServicoCampo[],
    proposta.campos_valores ?? {}
  ) as Record<string, string | number | null>;

  const financial = syncLegacyFinancialFields(valoresBrutos, {
    setup: proposta.setup,
    mensalidade: proposta.mensalidade,
  });

  const { valorBruto: valorInicialBruto, valorFinal: valorInicialFinal } =
    resolveValorInicialComDesconto(valoresBrutos, proposta.desconto_setup, camposList, {
      setup: proposta.setup,
      valor_total: financial.valor_total,
    });

  const duracao = resolveDuracaoMeses(valoresBrutos, proposta.duracao);
  const temCampoSetup = tipoServicoTemCampoSetup(camposList);
  const temCampoValorTotal = tipoServicoTemCampoValorTotal(camposList);
  const valorTotalInformado = getCampoAmount(valoresBrutos, "valor_total") || financial.valor_total;
  const hasSetup = temCampoSetup && (valorInicialBruto > 0 || proposta.setup > 0);
  const hasValorTotalInicial =
    !temCampoSetup && temCampoValorTotal && valorInicialBruto > 0;

  const parcelaResolvida = resolveValorParcelaExibicao({
    campos: camposList,
    valores: valoresBrutos,
    duracao,
    valorTotalBruto: hasValorTotalInicial ? valorInicialBruto : valorTotalInformado,
    valorTotalFinal: hasValorTotalInicial ? valorInicialFinal : valorTotalInformado,
    descontoSetup: proposta.desconto_setup,
    descontoMensalidade: proposta.desconto_mensalidade,
    mensalidadeLegacy: proposta.mensalidade,
  });

  const parcelaFinal = parcelaResolvida.valor;
  const hasMensal =
    proposta.mensalidade > 0 ||
    getCampoAmount(valoresBrutos, "mensalidade") > 0 ||
    getCampoAmount(valoresBrutos, "valor_parcela") > 0;

  const isContratoComSetupSeparado = hasSetup && hasMensal;
  const isFeeMensal = hasValorTotalInicial && hasMensal;
  const isSetupIsento = proposta.desconto_setup === 100 && hasSetup;

  let valorTotalContrato: number;

  if (isContratoComSetupSeparado) {
    valorTotalContrato = valorInicialFinal + (duracao > 0 ? parcelaFinal * duracao : 0);
  } else if (isFeeMensal && proposta.desconto_mensalidade === 0) {
    valorTotalContrato = valorInicialFinal;
  } else if (hasMensal && duracao > 0) {
    valorTotalContrato = (hasSetup ? valorInicialFinal : 0) + parcelaFinal * duracao;
  } else if (valorTotalInformado > 0) {
    valorTotalContrato = hasValorTotalInicial ? valorInicialFinal : valorTotalInformado;
  } else {
    valorTotalContrato = valorInicialFinal;
  }

  const valorFinalSetup = isSetupIsento ? 0 : valorInicialFinal;
  const valoresExibicao: Record<string, string | number | null> = { ...valoresBrutos };

  if (temCampoSetup && valoresBrutos.setup != null && valoresBrutos.setup !== "") {
    valoresExibicao.setup = valorFinalSetup;
  }
  if (temCampoValorTotal && valoresBrutos.valor_total != null && valoresBrutos.valor_total !== "") {
    valoresExibicao.valor_total =
      proposta.desconto_setup === 100 && hasValorTotalInicial ? 0 : valorInicialFinal;
  }
  if (hasMensal) {
    if (valoresBrutos.valor_parcela != null && valoresBrutos.valor_parcela !== "") {
      valoresExibicao.valor_parcela = parcelaFinal;
    }
    if (valoresBrutos.mensalidade != null && valoresBrutos.mensalidade !== "") {
      valoresExibicao.mensalidade = parcelaFinal;
    }
  }

  return {
    valoresBrutos,
    valoresExibicao,
    valorInicialBruto,
    valorInicialFinal,
    valorTotalInformado,
    parcelaBruta: parcelaResolvida.valorBruto,
    parcelaFinal,
    parcelaAntesDescontoParcela: parcelaResolvida.valorAntesDescontoParcela,
    duracao,
    valorTotalContrato,
    valorFinalSetup,
    valorFinalMensal: parcelaFinal,
    hasSetup,
    hasValorTotalInicial,
    hasMensal,
    isSetupIsento,
  };
}

export function formatCamposForDisplay(camposValores: CamposValores, labels: Record<string, string>) {
  return Object.entries(camposValores)
    .filter(
      ([chave, value]) =>
        chave !== SETUP_DESCRICAO_CHAVE &&
        value !== null &&
        value !== undefined &&
        value !== ""
    )
    .map(([chave, value]) => {
      const label = labels[chave] ?? chave;
      const formatted =
        typeof value === "number"
          ? value.toLocaleString("pt-BR", { minimumFractionDigits: chave.includes("parcela") || chave.includes("mensalidade") || chave.includes("setup") || chave.includes("valor") ? 2 : 0 })
          : String(value);
      return `${label}: ${formatted}`;
    });
}

export function buildValoresFinanceirosText(
  camposValores: CamposValores,
  campos: { chave: string; label: string; tipo_campo: string }[],
  legacy?: {
    setup: number;
    mensalidade: number;
    duracao: number;
    desconto_setup?: number;
    desconto_mensalidade?: number;
  }
) {
  const lines: string[] = [];

  for (const campo of campos) {
    const raw = camposValores[campo.chave];
    if (raw === null || raw === undefined || raw === "") continue;

    if (campo.tipo_campo === "calculated" || campo.tipo_campo === "currency") {
      lines.push(
        `${campo.label}: R$ ${Number(raw).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
      );
    } else if (campo.tipo_campo === "percent") {
      lines.push(`${campo.label}: ${raw}%`);
    } else {
      lines.push(`${campo.label}: ${raw}`);
    }
  }

  if (lines.length === 0 && legacy) {
    const setupExibicao =
      legacy.desconto_setup != null && legacy.desconto_setup > 0
        ? applyDescontoPercent(legacy.setup, legacy.desconto_setup)
        : legacy.setup;
    const mensalExibicao =
      legacy.desconto_mensalidade != null && legacy.desconto_mensalidade > 0
        ? applyDescontoPercent(legacy.mensalidade, legacy.desconto_mensalidade)
        : legacy.mensalidade;

    lines.push(
      `Setup: R$ ${setupExibicao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      `Mensalidade: R$ ${mensalExibicao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      `Duração: ${legacy.duracao === 0 ? "prazo indeterminado" : `${legacy.duracao} meses`}`
    );
  }

  return lines.join("\n");
}
