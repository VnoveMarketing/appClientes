import type { CasePortfolio } from "@/lib/cases";
import { isValidCaseCodigo } from "@/lib/case-codigo";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ClienteCasesConfig = {
  categoria_case_id?: string | null;
  cases_incluir_ids?: string[] | null;
  cases_excluir_ids?: string[] | null;
};

export type CaseExibicao = Pick<
  CasePortfolio,
  "id" | "nome" | "imagem_url" | "link" | "ordem"
>;

export type CaseRefLookup = Pick<CasePortfolio, "id" | "codigo">;

export function isUuidRef(ref: string): boolean {
  return UUID_REGEX.test(ref);
}

/** Aceita UUID ou código curto (ex.: cli01, id-cli01). */
export function isValidCaseRef(ref: string): boolean {
  const normalized = ref.trim().toLowerCase();
  return isUuidRef(normalized) || isValidCaseCodigo(normalized);
}

/** Converte texto em referências (código ou UUID). */
export function parseCaseRefsInput(input: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const part of input.split(/[\s,;]+/)) {
    const ref = part.trim().toLowerCase();
    if (!ref || seen.has(ref) || !isValidCaseRef(ref)) continue;
    seen.add(ref);
    result.push(ref);
  }

  return result;
}

/** Mantém compatibilidade com chamadas antigas. */
export function parseCaseIdsInput(input: string): string[] {
  return parseCaseRefsInput(input);
}

export function resolveCaseRefsToUuids(
  refs: string[],
  cases: CaseRefLookup[]
): string[] {
  const byCodigo = new Map<string, string>();
  const byId = new Map<string, string>();

  for (const item of cases) {
    byId.set(item.id.toLowerCase(), item.id);
    if (item.codigo) {
      byCodigo.set(item.codigo.toLowerCase(), item.id);
    }
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const ref of refs) {
    const id = isUuidRef(ref) ? byId.get(ref) ?? ref : byCodigo.get(ref);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }

  return result;
}

export function formatCaseRefsForInput(
  uuids: string[] | null | undefined,
  cases: CaseRefLookup[]
): string {
  const codigoById = new Map(
    cases.map((item) => [item.id.toLowerCase(), item.codigo?.trim() || null])
  );

  return (uuids ?? [])
    .map((id) => codigoById.get(id.toLowerCase()) ?? id)
    .join(", ");
}

/** Mantém compatibilidade com chamadas antigas. */
export function formatCaseIdsForInput(
  ids: string[] | null | undefined,
  cases?: CaseRefLookup[]
): string {
  if (cases?.length) return formatCaseRefsForInput(ids, cases);
  return (ids ?? []).join(", ");
}

export function findUnknownCaseRefs(
  refs: string[],
  cases: CaseRefLookup[]
): string[] {
  const byCodigo = new Set(
    cases.filter((item) => item.codigo).map((item) => item.codigo!.toLowerCase())
  );
  const byId = new Set(cases.map((item) => item.id.toLowerCase()));

  return refs.filter((ref) => {
    if (isUuidRef(ref)) return !byId.has(ref);
    return !byCodigo.has(ref);
  });
}

/** Une cases da categoria + incluídos extras, removendo os excluídos. */
export function mergeClienteCases(
  categoriaCases: CaseExibicao[],
  includedCases: CaseExibicao[],
  excluirIds: string[]
): CaseExibicao[] {
  const excluirSet = new Set(excluirIds.map((id) => id.toLowerCase()));
  const byId = new Map<string, CaseExibicao>();

  for (const item of categoriaCases) {
    if (!excluirSet.has(item.id.toLowerCase())) {
      byId.set(item.id, item);
    }
  }

  for (const item of includedCases) {
    if (!excluirSet.has(item.id.toLowerCase())) {
      byId.set(item.id, item);
    }
  }

  return Array.from(byId.values()).sort((a, b) => {
    if (a.ordem !== b.ordem) return a.ordem - b.ordem;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}

export function normalizeClienteCaseIds(ids?: string[] | null): string[] {
  if (!Array.isArray(ids)) return [];
  return ids
    .map((id) => String(id).trim().toLowerCase())
    .filter((id) => isUuidRef(id));
}
