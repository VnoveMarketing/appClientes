const CODIGO_REGEX = /^[a-z][a-z0-9-]{1,30}$/;

/** Normaliza e valida código curto do case (ex.: cli01, id-cli01). */
export function normalizeCaseCodigo(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const codigo = value.trim().toLowerCase();
  if (!CODIGO_REGEX.test(codigo)) return null;
  return codigo;
}

export function isValidCaseCodigo(value: string): boolean {
  return normalizeCaseCodigo(value) !== null;
}

/** Sugere um código a partir do nome do case. */
export function suggestCaseCodigo(nome: string): string {
  const slug = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);

  if (slug) return `case-${slug}`;
  return `case-${Math.random().toString(36).slice(2, 6)}`;
}

/** Gera código único com sufixo numérico quando necessário. */
export function buildUniqueCaseCodigo(
  nome: string,
  usedCodigos: Iterable<string>
): string {
  const used = new Set(
    Array.from(usedCodigos)
      .map((codigo) => codigo.trim().toLowerCase())
      .filter(Boolean)
  );

  const base = suggestCaseCodigo(nome);
  if (!used.has(base)) return base;

  for (let i = 2; i <= 99; i++) {
    const candidate = `${base}-${i}`;
    if (!used.has(candidate)) return candidate;
  }

  return `${base}-${Date.now().toString(36).slice(-4)}`;
}

export function isCaseCodigoDuplicateMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("cases_codigo_unique") ||
    lower.includes("duplicate key") ||
    lower.includes("já está em uso")
  );
}

export function getCaseCodigoErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (isCaseCodigoDuplicateMessage(message)) {
    return message.includes("já está em uso")
      ? message
      : "Este código já está em uso por outro case. Escolha outro código.";
  }

  if (message.includes("Código inválido")) return message;
  return message || "Não foi possível salvar o case.";
}

export function formatCaseCodigoEmUso(codigo: string, caseNome: string): string {
  return `O código "${codigo}" já está em uso pelo case "${caseNome}".`;
}
