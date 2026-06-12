import { NextRequest } from "next/server";
import { jsonResponse, errorResponse } from "@/lib/api/auth";
import { getAdminSupabase } from "@/lib/api/admin-db";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("propostas")
      .select("*, clientes(*)")
      .eq("id", id)
      .maybeSingle();

    if (error) return errorResponse(error.message, 500);
    if (!data) return errorResponse("Proposta não encontrada", 404);

    const { clientes, ...proposta } = data as Record<string, unknown> & {
      clientes: Record<string, unknown> | null;
    };

    let cases: unknown[] = [];
    const categoriaCaseId = clientes?.categoria_case_id as string | null | undefined;

    if (categoriaCaseId) {
      const { data: casesData } = await supabase
        .from("cases")
        .select("id, nome, imagem_url, link, ordem")
        .eq("categoria_id", categoriaCaseId)
        .order("ordem")
        .order("created_at", { ascending: false });

      cases = casesData ?? [];
    }

    return jsonResponse({ proposta, cliente: clientes, cases });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Erro interno", 500);
  }
}
