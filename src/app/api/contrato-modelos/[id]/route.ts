import { NextRequest } from "next/server";
import {
  requireContratosAccess,
  requireDeleteAccess,
  jsonResponse,
  errorResponse,
} from "@/lib/api/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireContratosAccess();
  if ("error" in auth) return auth.error;

  const body = await request.json();

  if (body.ativo === true) {
    await auth.supabase.from("contrato_modelos").update({ ativo: false }).neq("id", id);
  }

  const { data, error } = await auth.supabase
    .from("contrato_modelos")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireDeleteAccess();
  if ("error" in auth) return auth.error;

  const { error } = await auth.supabase.from("contrato_modelos").delete().eq("id", id);
  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ success: true });
}
