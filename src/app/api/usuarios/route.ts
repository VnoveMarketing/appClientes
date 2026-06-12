import { NextRequest } from "next/server";
import { requireAdmin, jsonResponse, errorResponse } from "@/lib/api/auth";
import { getAdminSupabase } from "@/lib/api/admin-db";
import { getAppUrl } from "@/lib/email/resend";
import type { NivelPermissao } from "@/lib/usuarios";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from("profiles")
    .select("*, tipos_usuario(*)")
    .order("created_at", { ascending: false });

  if (error) return errorResponse(error.message, 500);

  const usuarios = (data ?? []).map((row) => {
    const { tipos_usuario, ...profile } = row as Record<string, unknown> & {
      tipos_usuario: Record<string, unknown> | null;
    };
    return { ...profile, tipo_usuario: tipos_usuario };
  });

  return jsonResponse(usuarios);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { email, full_name, tipo_usuario_id, nivel_permissao } = body as {
    email: string;
    full_name: string;
    tipo_usuario_id: string;
    nivel_permissao: NivelPermissao;
  };

  if (!email?.trim() || !full_name?.trim() || !tipo_usuario_id || !nivel_permissao) {
    return errorResponse("E-mail, nome, tipo de usuário e nível de permissão são obrigatórios");
  }

  const { data: tipo, error: tipoError } = await auth.supabase
    .from("tipos_usuario")
    .select("id, slug, nome, ativo")
    .eq("id", tipo_usuario_id)
    .maybeSingle();

  if (tipoError) return errorResponse(tipoError.message, 500);
  if (!tipo) return errorResponse("Tipo de usuário não encontrado", 404);
  if (!tipo.ativo) return errorResponse("Tipo de usuário inativo", 400);

  const admin = getAdminSupabase();
  const normalizedEmail = email.trim().toLowerCase();
  const now = new Date().toISOString();
  const redirectTo = `${getAppUrl()}/auth/callback?next=/clientes`;

  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    normalizedEmail,
    {
      redirectTo,
      data: {
        full_name: full_name.trim(),
        role: tipo.slug,
        tipo_usuario_id: tipo.id,
        nivel_permissao,
      },
    }
  );

  if (inviteError) {
    return errorResponse(inviteError.message, 400);
  }

  const userId = inviteData.user?.id;
  if (!userId) {
    return errorResponse("Convite enviado, mas não foi possível obter o ID do usuário", 500);
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .upsert(
      {
        id: userId,
        email: normalizedEmail,
        full_name: full_name.trim(),
        role: tipo.slug,
        tipo_usuario_id: tipo.id,
        nivel_permissao,
        convite_status: "pendente",
        convite_enviado_em: now,
        convite_aceito_em: null,
        ativo: true,
      },
      { onConflict: "id" }
    )
    .select("*, tipos_usuario(*)")
    .single();

  if (profileError) return errorResponse(profileError.message, 500);

  const { tipos_usuario, ...rest } = profile as Record<string, unknown> & {
    tipos_usuario: Record<string, unknown> | null;
  };

  return jsonResponse(
    {
      ...rest,
      tipo_usuario: tipos_usuario,
      message: "Convite enviado por e-mail. O usuário deve aceitar para ativar o acesso.",
    },
    201
  );
}
