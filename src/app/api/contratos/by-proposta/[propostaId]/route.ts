import { NextRequest } from "next/server";
import { requireAdmin, jsonResponse, errorResponse } from "@/lib/api/auth";

type RouteContext = { params: Promise<{ propostaId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { propostaId } = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from("contratos")
    .select("*")
    .eq("proposta_id", propostaId)
    .maybeSingle();

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data);
}
