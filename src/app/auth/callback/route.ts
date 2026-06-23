import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/clientes";
  const isPasswordRecovery = next === "/redefinir-senha";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && sessionData.user) {
      if (isPasswordRecovery) {
        return NextResponse.redirect(`${origin}/redefinir-senha`);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("convite_status, ativo")
        .eq("id", sessionData.user.id)
        .maybeSingle();

      if (!profile?.ativo || profile.convite_status !== "aceito") {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=conta_nao_ativada`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  if (isPasswordRecovery) {
    return NextResponse.redirect(`${origin}/redefinir-senha?error=link_invalido`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
