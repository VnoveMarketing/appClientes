import { NextRequest } from "next/server";
import { requireAdmin, jsonResponse, errorResponse } from "@/lib/api/auth";
import { getAdminSupabase } from "@/lib/api/admin-db";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const updates: Record<string, string> = {};
  if (body.chave !== undefined) updates.chave = String(body.chave).trim().toLowerCase();
  if (body.nome !== undefined) updates.nome = String(body.nome).trim();
  if (body.descricao !== undefined) updates.descricao = String(body.descricao).trim();
  if (body.modulo !== undefined) updates.modulo = String(body.modulo).trim().toLowerCase();

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("permissoes")
    .update(updates)
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

  const supabase = getAdminSupabase();
  const { error } = await supabase.from("permissoes").delete().eq("id", id);
  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ success: true });
}
