import { NextRequest } from "next/server";
import {
  requirePropostasAccess,
  jsonResponse,
  errorResponse,
} from "@/lib/api/auth";
import { notifyPropostaPronta } from "@/lib/email/notifications";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requirePropostasAccess();
  if ("error" in auth) return auth.error;

  const { data: proposta, error } = await auth.supabase
    .from("propostas")
    .select("id, cliente_id, status")
    .eq("id", id)
    .maybeSingle();

  if (error) return errorResponse(error.message, 500);
  if (!proposta) return errorResponse("Proposta não encontrada", 404);

  try {
    const result = await notifyPropostaPronta(proposta.id, proposta.cliente_id);
    if (result && !result.ok) {
      return errorResponse(result.error, 502);
    }
    return jsonResponse({ success: true, message: "E-mail enviado ao cliente" });
  } catch (e) {
    console.error("[email] enviar-email proposta:", e);
    return errorResponse("Falha ao enviar e-mail ao cliente", 502);
  }
}
