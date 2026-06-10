import { NextRequest } from "next/server";
import {
  requireClientesAccess,
  requireDeleteAccess,
  jsonResponse,
  errorResponse,
} from "@/lib/api/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireClientesAccess();
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return errorResponse(error.message, 500);
  if (!data) return errorResponse("Cliente não encontrado", 404);
  return jsonResponse(data);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireClientesAccess();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { data, error } = await auth.supabase
    .from("clientes")
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

  const { error } = await auth.supabase.from("clientes").delete().eq("id", id);
  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ success: true });
}
