import { NextRequest } from "next/server";
import { requireAdmin, jsonResponse, errorResponse } from "@/lib/api/auth";
import type { NivelPermissao } from "@/lib/usuarios";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  if (id === auth.userId) {
    const body = await request.json();
    if (body.ativo === false || body.role !== undefined) {
      return errorResponse("Você não pode desativar ou alterar o próprio perfil administrativo", 400);
    }
  }

  const body = await request.json();
  const { full_name, tipo_usuario_id, nivel_permissao, ativo } = body as {
    full_name?: string;
    tipo_usuario_id?: string;
    nivel_permissao?: NivelPermissao;
    ativo?: boolean;
  };

  const updates: Record<string, unknown> = {};
  if (full_name !== undefined) updates.full_name = full_name.trim();
  if (nivel_permissao !== undefined) updates.nivel_permissao = nivel_permissao;
  if (ativo !== undefined) updates.ativo = ativo;

  if (tipo_usuario_id !== undefined) {
    const { data: tipo } = await auth.supabase
      .from("tipos_usuario")
      .select("slug")
      .eq("id", tipo_usuario_id)
      .maybeSingle();
    if (!tipo) return errorResponse("Tipo de usuário não encontrado", 404);
    updates.tipo_usuario_id = tipo_usuario_id;
    updates.role = tipo.slug;
  }

  const { data, error } = await auth.supabase
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select("*, tipos_usuario(*)")
    .single();

  if (error) return errorResponse(error.message, 500);

  const { tipos_usuario, ...rest } = data as Record<string, unknown> & {
    tipos_usuario: Record<string, unknown> | null;
  };

  return jsonResponse({ ...rest, tipo_usuario: tipos_usuario });
}
