"use client";

import React, { useState, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Mail, ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { AgencyLogo } from "@/components/agency-brand";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (searchParams.get("convite") === "aceito") {
      setSuccessMsg("Conta ativada com sucesso! Faça login com o e-mail e a senha que você criou.");
    } else if (searchParams.get("error") === "conta_nao_ativada") {
      setErrorMsg(
        "Sua conta ainda não está ativa. Aceite o convite recebido por e-mail e crie sua senha."
      );
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setIsLoading(false);
      setErrorMsg("Credenciais inválidas. Verifique e-mail e senha.");
      return;
    }

    const meRes = await fetch("/api/auth/me");
    if (!meRes.ok) {
      await supabase.auth.signOut();
      setIsLoading(false);
      const data = await meRes.json().catch(() => ({}));
      setErrorMsg(
        data.error ??
          "Sua conta ainda não está ativa. Aceite o convite recebido por e-mail e crie sua senha."
      );
      return;
    }

    setIsLoading(false);
    router.push("/clientes");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-zinc-100 flex flex-col justify-center items-center py-12 px-6 font-sans">
      <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-[#09A3E9]/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      <Card className="bg-[#161616] border border-zinc-800/80 max-w-sm w-full shadow-2xl p-6 md:p-8">
        <CardHeader className="p-0 mb-6 text-center">
          <div className="flex justify-center mb-3">
            <AgencyLogo height={40} />
          </div>
          <CardTitle className="text-lg font-bold text-white mt-4">Acesso ao Portal Interno</CardTitle>
          <CardDescription className="text-zinc-500 text-xs mt-1">
            Entre com suas credenciais administrativas.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {successMsg && (
              <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-3 py-2">
                {successMsg}
              </p>
            )}
            {errorMsg && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-md px-3 py-2">
                {errorMsg}
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-zinc-400 text-xs flex items-center gap-1.5">
                <Mail className="size-3.5 text-zinc-500" /> E-mail
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite seu e-mail"
                className="bg-zinc-900 border-zinc-800 text-white text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-zinc-400 text-xs flex items-center gap-1.5">
                <Lock className="size-3.5 text-zinc-500" /> Senha
              </Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-zinc-900 border-zinc-800 text-white text-sm"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="bg-[#09A3E9] text-white hover:bg-[#09A3E9]/90 font-bold py-2.5 mt-2 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-[#09A3E9]/20"
            >
              {isLoading ? "Entrando..." : "Acessar Painel"}
              <ArrowRight className="size-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B0B0B] text-zinc-100 flex items-center justify-center">
          <p className="text-sm text-zinc-400">Carregando...</p>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
