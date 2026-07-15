import { NextRequest } from "next/server";
import { jsonResponse, errorResponse } from "@/lib/api/auth";
import { getAdminSupabase } from "@/lib/api/admin-db";
import {
  mergeClienteCases,
  normalizeClienteCaseIds,
  type CaseExibicao,
} from "@/lib/cliente-cases";

type RouteContext = { params: Promise<{ id: string }> };

const CASE_SELECT = "id, nome, imagem_url, link, ordem, categoria_id";

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const supabase = getAdminSupabase();

    const { data: proposta, error: propostaError } = await supabase
      .from("propostas")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (propostaError) return errorResponse(propostaError.message, 500);
    if (!proposta) return errorResponse("Proposta não encontrada", 404);

    const { data: clientes } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", proposta.cliente_id)
      .maybeSingle();

    const categoriaCaseId = clientes?.categoria_case_id as string | null | undefined;
    const incluirIds = normalizeClienteCaseIds(
      clientes?.cases_incluir_ids as string[] | null | undefined
    );
    const excluirIds = normalizeClienteCaseIds(
      clientes?.cases_excluir_ids as string[] | null | undefined
    );

    let categoriaCases: CaseExibicao[] = [];

    if (categoriaCaseId) {
      const { data: casesData } = await supabase
        .from("cases")
        .select(CASE_SELECT)
        .eq("categoria_id", categoriaCaseId)
        .order("ordem")
        .order("created_at", { ascending: false });

      categoriaCases = (casesData ?? []) as CaseExibicao[];
    }

    let includedCases: CaseExibicao[] = [];

    if (incluirIds.length > 0) {
      const { data: extraCases } = await supabase
        .from("cases")
        .select(CASE_SELECT)
        .in("id", incluirIds);

      includedCases = (extraCases ?? []) as CaseExibicao[];
    }

    const cases = mergeClienteCases(categoriaCases, includedCases, excluirIds);

    let tipoServico: Record<string, unknown> | null = null;
    const tipoServicoId = proposta.tipo_servico_id as string | null | undefined;

    if (tipoServicoId) {
      const { data: tipo } = await supabase
        .from("tipos_servico")
        .select("id, nome, descricao")
        .eq("id", tipoServicoId)
        .maybeSingle();

      if (tipo) {
        const { data: tipoCampos } = await supabase
          .from("tipo_servico_campos")
          .select("*")
          .eq("tipo_servico_id", tipoServicoId)
          .order("ordem");

        tipoServico = { ...tipo, campos: tipoCampos ?? [] };
      }
    }

    return jsonResponse({ proposta, cliente: clientes ?? null, cases, tipo_servico: tipoServico });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Erro interno", 500);
  }
}
