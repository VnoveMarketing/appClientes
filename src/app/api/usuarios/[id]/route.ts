import { NextRequest } from "next/server";
import { requireAdmin, jsonResponse, errorResponse } from "@/lib/api/auth";
import { getAdminSupabase } from "@/lib/api/admin-db";
import type { NivelPermissao } from "@/lib/usuarios";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { full_name, tipo_usuario_id, nivel_permissao, ativo } = body as {
    full_name?: string;
    tipo_usuario_id?: string;
    nivel_permissao?: NivelPermissao;
    ativo?: boolean;
  };

  if (id === auth.userId) {
    if (ativo === false) {
      return errorResponse("Você não pode desativar o próprio perfil administrativo", 400);
    }
    if (tipo_usuario_id !== undefined) {
      return errorResponse("Você não pode alterar o próprio tipo de usuário", 400);
    }
  }

  const updates: Record<string, unknown> = {};
  if (full_name !== undefined) updates.full_name = full_name.trim();
  if (nivel_permissao !== undefined) updates.nivel_permissao = nivel_permissao;
  if (ativo !== undefined) updates.ativo = ativo;

  if (tipo_usuario_id !== undefined) {
    const supabase = getAdminSupabase();
    const { data: tipo, error: tipoError } = await supabase
      .from("tipos_usuario")
      .select("slug, ativo")
      .eq("id", tipo_usuario_id)
      .maybeSingle();

    if (tipoError) return errorResponse(tipoError.message, 500);
    if (!tipo) return errorResponse("Tipo de usuário não encontrado", 404);
    if (!tipo.ativo) return errorResponse("Tipo de usuário inativo", 400);

    updates.tipo_usuario_id = tipo_usuario_id;
    updates.role = tipo.slug;
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse("Nenhum campo válido para atualização");
  }

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select("*, tipos_usuario(*)")
    .single();

  if (error) return errorResponse(error.message, 500);

  if (updates.role) {
    await admin.auth.admin.updateUserById(id, {
      user_metadata: {
        role: updates.role,
        ...(tipo_usuario_id ? { tipo_usuario_id } : {}),
      },
    });
  }

  const { tipos_usuario, ...rest } = data as Record<string, unknown> & {
    tipos_usuario: Record<string, unknown> | null;
  };

  return jsonResponse({ ...rest, tipo_usuario: tipos_usuario });
}
