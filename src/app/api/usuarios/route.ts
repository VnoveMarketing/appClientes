import { NextRequest } from "next/server";
import { requireAdmin, jsonResponse, errorResponse } from "@/lib/api/auth";
import { getAdminSupabase } from "@/lib/api/admin-db";
import { provisionUsuarioConvite } from "@/lib/convite";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
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
  const { email, full_name, tipo_usuario_id } = body as {
    email: string;
    full_name: string;
    tipo_usuario_id: string;
  };

  if (!email?.trim() || !full_name?.trim() || !tipo_usuario_id) {
    return errorResponse("E-mail, nome e tipo de usuário são obrigatórios");
  }

  const supabase = getAdminSupabase();
  const { data: tipo, error: tipoError } = await supabase
    .from("tipos_usuario")
    .select("id, slug, nome, ativo")
    .eq("id", tipo_usuario_id)
    .maybeSingle();

  if (tipoError) return errorResponse(tipoError.message, 500);
  if (!tipo) return errorResponse("Tipo de usuário não encontrado", 404);
  if (!tipo.ativo) return errorResponse("Tipo de usuário inativo", 400);

  try {
    const result = await provisionUsuarioConvite({
      email: email.trim(),
      full_name: full_name.trim(),
      tipo_usuario_id: tipo.id,
      tipo_slug: tipo.slug,
      tipo_nome: tipo.nome,
    });

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*, tipos_usuario(*)")
      .eq("id", result.profileId)
      .single();

    if (profileError) return errorResponse(profileError.message, 500);

    const { tipos_usuario, ...rest } = profile as Record<string, unknown> & {
      tipos_usuario: Record<string, unknown> | null;
    };

    const message = result.emailSent
      ? "Convite enviado por e-mail. O usuário deve aceitar o convite e criar uma senha para acessar o sistema."
      : `Convite criado, mas o e-mail não foi enviado: ${result.emailError ?? "erro desconhecido"}`;

    return jsonResponse(
      {
        ...rest,
        tipo_usuario: tipos_usuario,
        message,
        email_sent: result.emailSent,
      },
      201
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao enviar convite";
    return errorResponse(message, 400);
  }
}
