import crypto from "crypto";
import { getAdminSupabase } from "@/lib/api/admin-db";
import { getAppUrl } from "@/lib/email/resend";
import { sendUsuarioConviteEmail } from "@/lib/email/notifications";

export const CONVITE_VALIDADE_DIAS = 7;

export function generateConviteToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function normalizeConviteToken(raw: string) {
  let token = raw.trim();

  try {
    let decoded = decodeURIComponent(token);
    while (decoded !== token) {
      token = decoded;
      decoded = decodeURIComponent(token);
    }
  } catch {
    // Mantém o valor original quando a decodificação falhar.
  }

  return token.replace(/\s+/g, "");
}

export function hashConviteToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getConviteExpiraEm(from = new Date()) {
  const date = new Date(from);
  date.setDate(date.getDate() + CONVITE_VALIDADE_DIAS);
  return date.toISOString();
}

export function buildConviteUrl(token: string) {
  const normalized = normalizeConviteToken(token);
  return `${getAppUrl()}/convite/${normalized}`;
}

export function isConviteExpirado(expiraEm: string | null | undefined) {
  if (!expiraEm) return true;
  return new Date(expiraEm).getTime() < Date.now();
}

async function findAuthUserByEmail(email: string) {
  const admin = getAdminSupabase();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(error.message);

  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

export type ProvisionConviteParams = {
  email: string;
  full_name: string;
  tipo_usuario_id: string;
  tipo_slug: string;
  tipo_nome: string;
};

export type ProvisionConviteResult = {
  profileId: string;
  emailSent: boolean;
  emailError?: string;
};

export async function provisionUsuarioConvite(
  params: ProvisionConviteParams
): Promise<ProvisionConviteResult> {
  const admin = getAdminSupabase();
  const normalizedEmail = params.email.trim().toLowerCase();
  const now = new Date().toISOString();
  const token = generateConviteToken();
  const tokenHash = hashConviteToken(token);
  const expiraEm = getConviteExpiraEm();
  const conviteUrl = buildConviteUrl(token);

  const { data: existingProfile, error: existingError } = await admin
    .from("profiles")
    .select("id, convite_status, email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (existingProfile?.convite_status === "aceito") {
    throw new Error("Já existe um usuário ativo com este e-mail.");
  }

  let userId = existingProfile?.id;

  if (!userId) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      email_confirm: false,
      user_metadata: {
        full_name: params.full_name.trim(),
        role: params.tipo_slug,
        tipo_usuario_id: params.tipo_usuario_id,
      },
    });

    if (createError) {
      const existingAuthUser = await findAuthUserByEmail(normalizedEmail);
      if (!existingAuthUser) throw new Error(createError.message);
      userId = existingAuthUser.id;
    } else {
      userId = created.user.id;
    }
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .upsert(
      {
        id: userId,
        email: normalizedEmail,
        full_name: params.full_name.trim(),
        role: params.tipo_slug,
        tipo_usuario_id: params.tipo_usuario_id,
        nivel_permissao: null,
        convite_status: "pendente",
        convite_enviado_em: now,
        convite_aceito_em: null,
        convite_token_hash: tokenHash,
        convite_expira_em: expiraEm,
        ativo: true,
      },
      { onConflict: "id" }
    )
    .select("id")
    .single();

  if (profileError) throw new Error(profileError.message);

  const emailResult = await sendUsuarioConviteEmail({
    to: normalizedEmail,
    fullName: params.full_name.trim(),
    tipoNome: params.tipo_nome,
    conviteUrl,
  });

  return {
    profileId: profile.id,
    emailSent: emailResult.ok,
    emailError: emailResult.ok ? undefined : emailResult.error,
  };
}

export async function getProfileByConviteToken(token: string) {
  const admin = getAdminSupabase();
  const normalizedToken = normalizeConviteToken(token);
  const tokenHash = hashConviteToken(normalizedToken);

  const { data: profile, error } = await admin
    .from("profiles")
    .select("id, email, full_name, convite_status, convite_expira_em, tipos_usuario(nome)")
    .eq("convite_token_hash", tokenHash)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!profile) return null;

  if (profile.convite_status !== "pendente") {
    return { profile, invalidReason: "already_accepted" as const };
  }

  if (isConviteExpirado(profile.convite_expira_em)) {
    await admin
      .from("profiles")
      .update({ convite_status: "expirado", convite_token_hash: null })
      .eq("id", profile.id);

    return { profile, invalidReason: "expired" as const };
  }

  return { profile, invalidReason: null };
}

export async function aceitarConviteUsuario(params: {
  token: string;
  password: string;
}) {
  const resolved = await getProfileByConviteToken(params.token);

  if (!resolved) {
    throw new Error("Convite inválido ou não encontrado.");
  }

  if (resolved.invalidReason === "already_accepted") {
    throw new Error("Este convite já foi aceito. Faça login com sua senha.");
  }

  if (resolved.invalidReason === "expired") {
    throw new Error("Este convite expirou. Solicite um novo convite ao administrador.");
  }

  const profile = resolved.profile;
  const admin = getAdminSupabase();
  const now = new Date().toISOString();

  const { error: authError } = await admin.auth.admin.updateUserById(profile.id, {
    password: params.password,
    email_confirm: true,
  });

  if (authError) throw new Error(authError.message);

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      convite_status: "aceito",
      convite_aceito_em: now,
      convite_token_hash: null,
      convite_expira_em: null,
      ativo: true,
    })
    .eq("id", profile.id);

  if (profileError) throw new Error(profileError.message);

  return { profileId: profile.id, email: profile.email };
}
