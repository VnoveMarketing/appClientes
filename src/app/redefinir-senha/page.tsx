"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, ArrowRight } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { AgencyLogo } from "@/components/agency-brand";

function RedefinirSenhaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (searchParams.get("error") === "link_invalido") {
      setErrorMsg("Link de redefinição inválido ou expirado. Solicite um novo e-mail.");
      setCheckingSession(false);
      return;
    }

    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/login?error=link_redefinicao_invalido");
        return;
      }
      setCheckingSession(false);
    });
  }, [router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (password.length < 8) {
      setErrorMsg("A senha deve ter no mínimo 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("As senhas não conferem.");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setIsLoading(false);
      setErrorMsg("Não foi possível redefinir a senha. Solicite um novo link.");
      return;
    }

    await supabase.auth.signOut();
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});

    router.push("/login?senha=redefinida");
    router.refresh();
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] text-zinc-100 flex items-center justify-center">
        <p className="text-sm text-zinc-400">Validando link de redefinição...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-zinc-100 flex flex-col justify-center items-center py-12 px-6 font-sans">
      <Card className="bg-[#161616] border border-zinc-800/80 max-w-sm w-full shadow-2xl p-6 md:p-8">
        <CardHeader className="p-0 mb-6 text-center">
          <div className="flex justify-center mb-3">
            <AgencyLogo height={40} />
          </div>
          <CardTitle className="text-lg font-bold text-white mt-4">Redefinir senha</CardTitle>
          <CardDescription className="text-zinc-500 text-xs mt-1">
            Crie uma nova senha para acessar o portal.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {errorMsg && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-md px-3 py-2">
                {errorMsg}
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-zinc-400 text-xs flex items-center gap-1.5">
                <Lock className="size-3.5 text-zinc-500" /> Nova senha
              </Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo de 8 caracteres"
                className="bg-zinc-900 border-zinc-800 text-white text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="confirmPassword"
                className="text-zinc-400 text-xs flex items-center gap-1.5"
              >
                <Lock className="size-3.5 text-zinc-500" /> Confirmar senha
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                className="bg-zinc-900 border-zinc-800 text-white text-sm"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="bg-[#09A3E9] text-white hover:bg-[#09A3E9]/90 font-bold py-2.5 mt-2 rounded-lg flex items-center justify-center gap-2"
            >
              {isLoading ? "Salvando..." : "Salvar nova senha"}
              <ArrowRight className="size-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B0B0B] text-zinc-100 flex items-center justify-center">
          <p className="text-sm text-zinc-400">Carregando...</p>
        </div>
      }
    >
      <RedefinirSenhaContent />
    </Suspense>
  );
}
