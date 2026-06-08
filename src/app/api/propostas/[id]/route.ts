import { NextRequest } from "next/server";
import { requireAdmin, jsonResponse, errorResponse } from "@/lib/api/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from("propostas")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return errorResponse(error.message, 500);
  if (!data) return errorResponse("Proposta não encontrada", 404);
  return jsonResponse(data);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { data, error } = await auth.supabase
    .from("propostas")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { error } = await auth.supabase.from("propostas").delete().eq("id", id);
  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ success: true });
}
