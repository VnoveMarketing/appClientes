import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildUniqueCaseCodigo,
  formatCaseCodigoEmUso,
  normalizeCaseCodigo,
} from "@/lib/case-codigo";

type CaseCodigoRow = {
  id: string;
  nome: string;
  codigo: string | null;
};

export async function resolveCaseCodigoForSave(
  supabase: SupabaseClient,
  params: {
    nome: string;
    codigo?: string | null;
    excludeCaseId?: string;
  }
): Promise<{ codigo: string } | { error: string }> {
  const { data: existing, error } = await supabase
    .from("cases")
    .select("id, nome, codigo");

  if (error) return { error: error.message };

  const rows = (existing ?? []) as CaseCodigoRow[];
  const usedCodigos = rows
    .filter((row) => row.id !== params.excludeCaseId)
    .map((row) => String(row.codigo ?? "").trim().toLowerCase())
    .filter(Boolean);

  const manual = normalizeCaseCodigo(params.codigo);

  if (params.codigo != null && String(params.codigo).trim() && !manual) {
    return {
      error:
        "Código inválido. Use letras minúsculas, números e hífens (ex.: cli01, id-cli01).",
    };
  }

  const codigo =
    manual ?? buildUniqueCaseCodigo(params.nome.trim(), usedCodigos);

  const duplicate = rows.find(
    (row) =>
      row.id !== params.excludeCaseId &&
      String(row.codigo ?? "").trim().toLowerCase() === codigo
  );

  if (duplicate) {
    return {
      error: formatCaseCodigoEmUso(codigo, duplicate.nome),
    };
  }

  return { codigo };
}
