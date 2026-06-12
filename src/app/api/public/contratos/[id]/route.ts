import { NextRequest } from "next/server";
import { jsonResponse, errorResponse } from "@/lib/api/auth";
import { getAdminSupabase } from "@/lib/api/admin-db";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("contratos")
      .select("*, clientes(*)")
      .eq("id", id)
      .maybeSingle();

    if (error) return errorResponse(error.message, 500);
    if (!data) return errorResponse("Contrato não encontrado", 404);

    if (data.status === "pendente_financeiro") {
      return errorResponse(
        "Contrato em revisão pela equipe financeira. Você será notificado quando estiver disponível para assinatura.",
        403
      );
    }

    const { clientes, ...contrato } = data as Record<string, unknown> & {
      clientes: Record<string, unknown> | null;
    };

    return jsonResponse({ contrato, cliente: clientes });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Erro interno", 500);
  }
}
