import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/clientes";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && sessionData.user) {
      await supabase
        .from("profiles")
        .update({
          convite_status: "aceito",
          convite_aceito_em: new Date().toISOString(),
          ativo: true,
        })
        .eq("id", sessionData.user.id);

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
