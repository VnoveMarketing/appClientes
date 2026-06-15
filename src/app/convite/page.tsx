"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Mail, User, ArrowRight, ShieldCheck } from "lucide-react";
import { AgencyLogo } from "@/components/agency-brand";

type ConviteInfo = {
  email: string;
  full_name: string | null;
  tipo_nome: string | null;
  expira_em: string | null;
};

function ConvitePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [convite, setConvite] = useState<ConviteInfo | null>(null);
  const [loadingConvite, setLoadingConvite] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!token) {
      setLoadError("Link de convite inválido. Verifique o e-mail recebido.");
      setLoadingConvite(false);
      return;
    }

    fetch(`/api/public/convite?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Convite inválido");
        }
        setConvite(data);
      })
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : "Convite inválido");
      })
      .finally(() => setLoadingConvite(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (password.length < 8) {
      setSubmitError("A senha deve ter no mínimo 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError("As senhas não conferem.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/public/convite/aceitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          confirm_password: confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Não foi possível ativar a conta");
      }

      router.push("/login?convite=aceito");
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Erro ao ativar conta");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-zinc-100 flex flex-col justify-center items-center py-12 px-6 font-sans">
      <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-[#09A3E9]/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      <Card className="bg-[#161616] border border-zinc-800/80 max-w-md w-full shadow-2xl p-6 md:p-8">
        <CardHeader className="p-0 mb-6 text-center">
          <div className="flex justify-center mb-3">
            <AgencyLogo height={40} />
          </div>
          <CardTitle className="text-lg font-bold text-white mt-4 flex items-center justify-center gap-2">
            <ShieldCheck className="size-5 text-[#09A3E9]" />
            Aceitar convite
          </CardTitle>
          <CardDescription className="text-zinc-500 text-xs mt-1">
            Confirme seus dados e crie uma senha para acessar o portal interno.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loadingConvite ? (
            <p className="text-sm text-zinc-400 text-center py-8">Validando convite...</p>
          ) : loadError ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-md px-3 py-3">
                {loadError}
              </p>
              <Button
                type="button"
                variant="outline"
                className="border-zinc-700"
                onClick={() => router.push("/login")}
              >
                Ir para o login
              </Button>
            </div>
          ) : convite ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {submitError && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-md px-3 py-2">
                  {submitError}
                </p>
              )}

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <User className="size-4 text-zinc-500" />
                  <span>{convite.full_name || "Usuário convidado"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Mail className="size-4 text-zinc-500" />
                  <span>{convite.email}</span>
                </div>
                {convite.tipo_nome ? (
                  <p className="text-xs text-zinc-500">Perfil: {convite.tipo_nome}</p>
                ) : null}
              </div>

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
                disabled={isSubmitting}
                className="bg-[#09A3E9] text-white hover:bg-[#09A3E9]/90 font-bold py-2.5 mt-2 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-[#09A3E9]/20"
              >
                {isSubmitting ? "Ativando conta..." : "Ativar conta e acessar"}
                <ArrowRight className="size-4" />
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B0B0B] text-zinc-100 flex items-center justify-center">
          <p className="text-sm text-zinc-400">Carregando convite...</p>
        </div>
      }
    >
      <ConvitePageContent />
    </Suspense>
  );
}
