type CamposValores = Record<string, string | number | null | undefined>;

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
    overrides?.duracao ?? Number(c.tempo_recorrencia ?? c.numero_parcelas ?? 12);
  const valorTotal = Number(c.valor_total ?? 0);

  return {
    setup: Number.isFinite(setup) ? setup : 0,
    mensalidade: Number.isFinite(mensalidade) ? mensalidade : 0,
    duracao: Number.isFinite(duracao) ? duracao : 0,
    valor_total: Number.isFinite(valorTotal) ? valorTotal : 0,
  };
}

export function formatCamposForDisplay(camposValores: CamposValores, labels: Record<string, string>) {
  return Object.entries(camposValores)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
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
  legacy?: { setup: number; mensalidade: number; duracao: number; desconto_setup?: number; desconto_mensalidade?: number }
) {
  const lines: string[] = [];

  for (const campo of campos) {
    if (campo.tipo_campo === "calculated") {
      const raw = camposValores[campo.chave];
      if (raw === null || raw === undefined || raw === "") continue;
      lines.push(
        `${campo.label}: R$ ${Number(raw).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
      );
      continue;
    }

    const raw = camposValores[campo.chave];
    if (raw === null || raw === undefined || raw === "") continue;

    if (campo.tipo_campo === "currency") {
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
    lines.push(
      `Setup: R$ ${legacy.setup.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      `Mensalidade: R$ ${legacy.mensalidade.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      `Duração: ${legacy.duracao === 0 ? "prazo indeterminado" : `${legacy.duracao} meses`}`
    );
  }

  return lines.join("\n");
}
