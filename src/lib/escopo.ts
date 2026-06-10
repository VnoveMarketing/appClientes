export type EscopoItemRef = {
  nome: string;
  descricao: string;
  escopo_item_id?: string | null;
};

export type EscopoItemCatalog = {
  id: string;
  nome: string;
  descricao: string;
  created_at: string;
};

export function normalizeEscopo(escopo: unknown): EscopoItemRef[] {
  if (!Array.isArray(escopo)) return [];

  return escopo.map((item) => {
    if (typeof item === "string") {
      return { nome: item, descricao: "" };
    }
    if (item && typeof item === "object" && "nome" in item) {
      const record = item as Record<string, unknown>;
      return {
        nome: String(record.nome ?? ""),
        descricao: String(record.descricao ?? ""),
        escopo_item_id: record.escopo_item_id ? String(record.escopo_item_id) : null,
      };
    }
    return { nome: String(item), descricao: "" };
  });
}

export function getEscopoNome(item: EscopoItemRef | string): string {
  return typeof item === "string" ? item : item.nome;
}

export function formatEscopoForContract(
  escopo: unknown,
  escopoDescricaoAdicional?: string | null
): string {
  const items = normalizeEscopo(escopo);
  const lines = items.map((item, i) => {
    const desc = item.descricao?.trim();
    return desc
      ? `  ${i + 1}. ${item.nome}\n     ${desc}`
      : `  ${i + 1}. ${item.nome}`;
  });

  let text = lines.join("\n");
  if (escopoDescricaoAdicional?.trim()) {
    text += `\n\n  Detalhamento adicional do escopo:\n  ${escopoDescricaoAdicional.trim()}`;
  }
  return text;
}
