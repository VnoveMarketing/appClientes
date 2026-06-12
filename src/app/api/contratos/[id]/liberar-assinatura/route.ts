import { NextRequest } from "next/server";
import { requireContratosAccess, jsonResponse, errorResponse } from "@/lib/api/auth";
import { notifyContratoProntoAssinatura } from "@/lib/email/notifications";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireContratosAccess();
  if ("error" in auth) return auth.error;

  const { data: contrato, error: fetchError } = await auth.supabase
    .from("contratos")
    .select("id, status, cliente_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return errorResponse(fetchError.message, 500);
  if (!contrato) return errorResponse("Contrato não encontrado", 404);

  if (contrato.status !== "pendente_financeiro") {
    return errorResponse(
      "Somente contratos aguardando revisão financeira podem ser liberados para assinatura",
      400
    );
  }

  const now = new Date().toISOString();
  const { data, error } = await auth.supabase
    .from("contratos")
    .update({
      status: "pendente_assinatura",
      liberado_para_assinatura_em: now,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);

  try {
    await notifyContratoProntoAssinatura(data.id, data.cliente_id);
  } catch (e) {
    console.error("[email] notifyContratoProntoAssinatura falhou:", e);
  }

  return jsonResponse(data);
}
