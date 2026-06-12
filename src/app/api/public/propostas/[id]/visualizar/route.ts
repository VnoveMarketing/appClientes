import { NextRequest } from "next/server";
import { jsonResponse, errorResponse } from "@/lib/api/auth";
import { getAdminSupabase } from "@/lib/api/admin-db";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const supabase = getAdminSupabase();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("propostas")
      .update({ visualizada_em: now })
      .eq("id", id)
      .select("id, visualizada_em")
      .maybeSingle();

    if (error) return errorResponse(error.message, 500);
    if (!data) return errorResponse("Proposta não encontrada", 404);

    return jsonResponse({ visualizada_em: data.visualizada_em });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Erro interno", 500);
  }
}
