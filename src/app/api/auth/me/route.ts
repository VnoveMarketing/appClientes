import { requireAuth, jsonResponse, errorResponse, ROLE_LABELS } from "@/lib/api/auth";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { data: profile, error } = await auth.supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", auth.userId)
    .maybeSingle();

  if (error) return errorResponse(error.message, 500);
  if (!profile) return errorResponse("Perfil não encontrado", 404);

  const role = profile.role as keyof typeof ROLE_LABELS;

  return jsonResponse({
    id: auth.userId,
    name: profile.full_name ?? ROLE_LABELS[role] ?? "Usuário",
    email: profile.email ?? auth.user.email ?? "",
    role,
    roleLabel: ROLE_LABELS[role] ?? role,
  });
}
