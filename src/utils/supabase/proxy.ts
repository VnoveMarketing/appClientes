import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          );
        },
      },
    }
  );

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const pathname = request.nextUrl.pathname;
  const isProtected =
    pathname.startsWith("/clientes") ||
    pathname.startsWith("/propostas") ||
    pathname.startsWith("/contratos") ||
    pathname.startsWith("/configuracoes");
  const isAuthPage = pathname === "/login";
  const isConvitePage = pathname === "/convite";
  const isRedefinirSenhaPage = pathname === "/redefinir-senha";

  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const userId = user?.sub as string | undefined;
  let accessProfile: { role: string; convite_status: string; ativo: boolean } | null = null;

  if (userId && (isProtected || isAuthPage || isConvitePage || isRedefinirSenhaPage || pathname === "/")) {
    const { data } = await supabase
      .from("profiles")
      .select("role, convite_status, ativo")
      .eq("id", userId)
      .maybeSingle();

    accessProfile = data;
  }

  const hasActiveAccess =
    !!accessProfile?.ativo && accessProfile.convite_status === "aceito";

  if (isProtected && user && !hasActiveAccess) {
    await supabase.auth.signOut();
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("error", "conta_nao_ativada");
    return NextResponse.redirect(redirectUrl);
  }

  if (isProtected && user && pathname.startsWith("/contratos")) {
    if (accessProfile?.role === "consultor") {
      return NextResponse.redirect(new URL("/clientes", request.url));
    }
  }

  if (isProtected && user && pathname.startsWith("/configuracoes")) {
    const isUsuariosConfig =
      pathname.startsWith("/configuracoes/usuarios") ||
      pathname.startsWith("/configuracoes/tipos-usuario") ||
      pathname.startsWith("/configuracoes/permissoes");

    if (isUsuariosConfig && accessProfile?.role !== "admin") {
      return NextResponse.redirect(new URL("/clientes", request.url));
    }

    if (accessProfile?.role === "consultor" && !isUsuariosConfig) {
      return NextResponse.redirect(new URL("/clientes", request.url));
    }
  }

  if (isConvitePage && user) {
    await supabase.auth.signOut();
  }

  if (isRedefinirSenhaPage) {
    return supabaseResponse;
  }

  if (isAuthPage && user) {
    if (hasActiveAccess) {
      return NextResponse.redirect(new URL("/clientes", request.url));
    }
    await supabase.auth.signOut();
  }

  if (pathname === "/" && user && hasActiveAccess) {
    return NextResponse.redirect(new URL("/clientes", request.url));
  }

  return supabaseResponse;
}
