import { NextRequest } from "next/server";
import { requireAdmin, jsonResponse, errorResponse } from "@/lib/api/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { nome, slug, descricao, ordem, ativo, permissoes } = body as {
    nome?: string;
    slug?: string;
    descricao?: string;
    ordem?: number;
    ativo?: boolean;
    permissoes?: { permissao_id: string; nivel: string }[];
  };

  const updates: Record<string, unknown> = {};
  if (nome !== undefined) updates.nome = nome.trim();
  if (slug !== undefined) updates.slug = slug.trim().toLowerCase();
  if (descricao !== undefined) updates.descricao = descricao.trim();
  if (ordem !== undefined) updates.ordem = ordem;
  if (ativo !== undefined) updates.ativo = ativo;

  const { data, error } = await auth.supabase
    .from("tipos_usuario")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);

  if (permissoes !== undefined) {
    await auth.supabase.from("tipo_usuario_permissoes").delete().eq("tipo_usuario_id", id);
    if (permissoes.length > 0) {
      const { error: permError } = await auth.supabase.from("tipo_usuario_permissoes").insert(
        permissoes.map((p) => ({
          tipo_usuario_id: id,
          permissao_id: p.permissao_id,
          nivel: p.nivel,
        }))
      );
      if (permError) return errorResponse(permError.message, 500);
    }
  }

  return jsonResponse(data);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { count } = await auth.supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("tipo_usuario_id", id);

  if ((count ?? 0) > 0) {
    return errorResponse("Não é possível excluir: existem usuários vinculados a este tipo", 400);
  }

  const { error } = await auth.supabase.from("tipos_usuario").delete().eq("id", id);
  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ success: true });
}
