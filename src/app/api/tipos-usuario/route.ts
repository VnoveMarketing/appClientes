import { NextRequest } from "next/server";
import { requireAdmin, jsonResponse, errorResponse } from "@/lib/api/auth";
import { getAdminSupabase } from "@/lib/api/admin-db";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("tipos_usuario")
    .select("*, tipo_usuario_permissoes(*, permissoes(*))")
    .order("ordem");

  if (error) return errorResponse(error.message, 500);

  const tipos = (data ?? []).map((row) => {
    const { tipo_usuario_permissoes, ...tipo } = row as Record<string, unknown> & {
      tipo_usuario_permissoes: Array<Record<string, unknown>>;
    };
    return {
      ...tipo,
      permissoes: (tipo_usuario_permissoes ?? []).map((tp) => ({
        id: tp.id,
        tipo_usuario_id: tp.tipo_usuario_id,
        permissao_id: tp.permissao_id,
        nivel: tp.nivel,
        permissao: tp.permissoes,
      })),
    };
  });

  return jsonResponse(tipos);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { nome, slug, descricao, ordem, ativo, permissoes } = body as {
    nome: string;
    slug: string;
    descricao?: string;
    ordem?: number;
    ativo?: boolean;
    permissoes?: { permissao_id: string; nivel: string }[];
  };

  if (!nome?.trim() || !slug?.trim()) {
    return errorResponse("Nome e slug são obrigatórios");
  }

  const supabase = getAdminSupabase();
  const { data: tipo, error } = await supabase
    .from("tipos_usuario")
    .insert([
      {
        nome: nome.trim(),
        slug: slug.trim().toLowerCase(),
        descricao: descricao?.trim() ?? "",
        ordem: ordem ?? 0,
        ativo: ativo ?? true,
      },
    ])
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);

  if (permissoes?.length) {
    const { error: permError } = await supabase.from("tipo_usuario_permissoes").insert(
      permissoes.map((p) => ({
        tipo_usuario_id: tipo.id,
        permissao_id: p.permissao_id,
        nivel: p.nivel,
      }))
    );
    if (permError) return errorResponse(permError.message, 500);
  }

  return jsonResponse(tipo, 201);
}
