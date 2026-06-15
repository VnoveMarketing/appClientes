"use client";

import React, { useState, useRef, use, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dbService } from "@/lib/db-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { normalizeContractText } from "@/lib/contract-builder";
import { AgencyLogo } from "@/components/agency-brand";
import { ContratoEvidenciasPanel } from "@/components/contrato-evidencias-panel";
import { FileSignature, ShieldCheck, Eraser, Check, AlertTriangle, Eye } from "lucide-react";
import { useHasMounted, ClientDate } from "@/components/client-date";

function isCanvasBlank(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] !== 0) return false;
  }
  return true;
}

async function captureGeolocation(): Promise<{
  geo_latitude: number;
  geo_longitude: number;
  geo_precisao: number;
  geo_fonte: string;
} | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          geo_latitude: pos.coords.latitude,
          geo_longitude: pos.coords.longitude,
          geo_precisao: pos.coords.accuracy,
          geo_fonte: "browser",
        }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  });
}

function ContratoPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const isAdminView = searchParams.get("painel") === "admin";
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hasMounted = useHasMounted();

  const [signatoryName, setSignatoryName] = useState("");
  const [signatoryCpf, setSignatoryCpf] = useState("");
  const [signatoryEmail, setSignatoryEmail] = useState("");
  const [signatoryPhone, setSignatoryPhone] = useState("");
  const [typedSignature, setTypedSignature] = useState("");
  const [signatureMode, setSignatureMode] = useState<"draw" | "type">("draw");
  const [isDrawing, setIsDrawing] = useState(false);
  const [geoNotice, setGeoNotice] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: isAdminView ? ["admin-contrato", id] : ["public-contrato", id],
    queryFn: () =>
      isAdminView
        ? dbService.getAdminContratoWithCliente(id)
        : dbService.getPublicContratoWithCliente(id),
    enabled: hasMounted,
    retry: isAdminView ? false : true,
  });

  const contrato = data?.contrato;
  const client = data?.cliente;

  const { data: evidencias } = useQuery({
    queryKey: ["contrato-evidencias", id],
    queryFn: () => dbService.getContratoEvidencias(id),
    enabled: hasMounted && isAdminView && contrato?.status === "assinado",
    retry: false,
  });

  useEffect(() => {
    if (!client) return;
    setSignatoryName(client.nome || "");
    setSignatoryEmail(client.email || "");
    setSignatoryPhone(client.telefone || "");
  }, [client]);

  useEffect(() => {
    if (isAdminView || !contrato || contrato.status !== "pendente_assinatura") return;
    dbService.trackContratoAssinaturaIniciada(id).catch(() => {});
  }, [id, contrato?.id, contrato?.status, isAdminView]);

  const signMutation = useMutation({
    mutationFn: async (evidencias: Parameters<typeof dbService.signPublicContrato>[1]) => {
      if (!contrato) return;
      await dbService.signPublicContrato(contrato.id, evidencias);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contrato", id] });
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
  });

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#FFFFFF";

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  if (!hasMounted || isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0B0B0B] text-zinc-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#09A3E9]" />
      </div>
    );
  }

  if (error || !contrato || !client) {
    const isForbidden =
      !isAdminView && String((error as Error)?.message ?? "").includes("revisão");
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0B0B0B] text-zinc-400">
        <div className="flex flex-col items-center gap-2 text-center max-w-md px-6">
          <AlertTriangle className="size-12 text-rose-500" />
          <span className="text-lg font-semibold text-white">
            {isForbidden ? "Contrato em preparação" : isAdminView ? "Acesso negado" : "Contrato não encontrado"}
          </span>
          <span className="text-sm text-zinc-500">
            {isForbidden
              ? "Nossa equipe financeira está finalizando o contrato. Você receberá um e-mail quando estiver disponível para assinatura."
              : isAdminView
              ? "Faça login no painel administrativo para visualizar este contrato."
              : "O link de assinatura é inválido ou o contrato ainda não foi liberado."}
          </span>
        </div>
      </div>
    );
  }

  const showClientSignaturePanel =
    !isAdminView && contrato.status === "pendente_assinatura";

  const handleSubmitSignature = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signatoryName.trim() || !signatoryCpf.trim()) {
      alert("Por favor, preencha o Nome e o CPF do assinante legal.");
      return;
    }

    if (!signatoryEmail.trim()) {
      alert("Por favor, informe o e-mail do signatário.");
      return;
    }

    let assinaturaConteudo = "";
    if (signatureMode === "draw") {
      const canvas = canvasRef.current;
      if (!canvas || isCanvasBlank(canvas)) {
        alert("Desenhe sua assinatura no campo indicado.");
        return;
      }
      assinaturaConteudo = canvas.toDataURL("image/png");
    } else {
      if (!typedSignature.trim()) {
        alert("Digite sua assinatura no campo indicado.");
        return;
      }
      assinaturaConteudo = typedSignature.trim();
    }

    setGeoNotice(null);
    const geo = await captureGeolocation();
    if (!geo) {
      setGeoNotice(
        "Geolocalização não disponível. A assinatura será registrada com IP e demais metadados."
      );
    }

    signMutation.mutate({
      signatario_nome: signatoryName.trim(),
      signatario_cpf: signatoryCpf.trim(),
      signatario_email: signatoryEmail.trim(),
      signatario_telefone: signatoryPhone.trim() || undefined,
      signatario_cnpj: client.cnpj || undefined,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      assinatura_tipo: signatureMode,
      assinatura_conteudo: assinaturaConteudo,
      otp_validado: false,
      ...(geo ?? {}),
    });
  };

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-zinc-100 py-12 px-6 flex flex-col justify-center items-center font-sans">
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#09A3E9]/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="w-full max-w-3xl flex flex-col gap-6">
        <div className="flex justify-center">
          <AgencyLogo height={36} />
        </div>
        <Card className="bg-[#161616] border border-zinc-800/80 shadow-2xl overflow-hidden">
          <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between bg-zinc-950/40">
            <div className="flex items-center gap-2">
              {isAdminView ? (
                <Eye className="size-5 text-[#09A3E9]" />
              ) : (
                <ShieldCheck className="size-5 text-[#09A3E9]" />
              )}
              <span className="text-xs text-zinc-400 font-mono tracking-wider">
                {isAdminView
                  ? "VISUALIZAÇÃO ADMINISTRATIVA · PAINEL VNOVE"
                  : "ASSINATURA DIGITAL · TRILHA DE AUDITORIA"}
              </span>
            </div>
            <Badge
              variant="secondary"
              className={`text-[9px] font-bold tracking-widest uppercase py-0.5 px-2.5 rounded-full border ${
                contrato.status === "assinado"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : contrato.status === "pendente_financeiro"
                  ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}
            >
              {contrato.status === "assinado"
                ? "Assinado"
                : contrato.status === "pendente_financeiro"
                ? "Aguardando Revisão"
                : "Aguardando Assinatura"}
            </Badge>
          </div>

          <CardContent className="p-6 md:p-8 flex flex-col gap-6">
            <div>
              <span className="text-zinc-500 text-xs font-mono uppercase tracking-widest">
                Prestação de Serviços
              </span>
              <h1 className="text-2xl font-black text-white mt-1">CONTRATO DE MARKETING DIGITAL</h1>
              <p className="text-xs text-zinc-400 mt-1">
                Representando: <strong className="text-white">{client.empresa}</strong> e a Agência
                Vnove.
              </p>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-6 max-h-[300px] overflow-y-auto text-zinc-300 font-sans text-xs whitespace-pre-wrap leading-relaxed shadow-inner">
              {normalizeContractText(contrato.conteudo_contrato)}
            </div>

            {showClientSignaturePanel ? (
              <form
                onSubmit={handleSubmitSignature}
                className="flex flex-col gap-5 border-t border-zinc-800/80 pt-6 mt-2"
              >
                <h3 className="text-sm font-semibold text-white">Painel do Assinante Legal</h3>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Os dados abaixo compõem a trilha de auditoria (identificação, autenticação e
                  integridade do documento) exigida para validade jurídica da assinatura eletrônica.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="signatoryName">
                      Nome completo do signatário *
                    </Label>
                    <Input
                      id="signatoryName"
                      required
                      value={signatoryName}
                      onChange={(e) => setSignatoryName(e.target.value)}
                      placeholder="Nome idêntico ao documento legal"
                      className="bg-zinc-900 border-zinc-800 text-white text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="signatoryCpf">
                      CPF *
                    </Label>
                    <Input
                      id="signatoryCpf"
                      required
                      value={signatoryCpf}
                      onChange={(e) => setSignatoryCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="bg-zinc-900 border-zinc-800 text-white text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="signatoryEmail">
                      E-mail *
                    </Label>
                    <Input
                      id="signatoryEmail"
                      type="email"
                      required
                      value={signatoryEmail}
                      onChange={(e) => setSignatoryEmail(e.target.value)}
                      placeholder="email@empresa.com"
                      className="bg-zinc-900 border-zinc-800 text-white text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="signatoryPhone">
                      Telefone celular
                    </Label>
                    <Input
                      id="signatoryPhone"
                      value={signatoryPhone}
                      onChange={(e) => setSignatoryPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="bg-zinc-900 border-zinc-800 text-white text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <Label>Assinatura digital *</Label>
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setSignatureMode("draw")}
                        className={`h-7 text-[10px] px-2 rounded ${
                          signatureMode === "draw"
                            ? "bg-zinc-800 text-white"
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        Desenhar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setSignatureMode("type")}
                        className={`h-7 text-[10px] px-2 rounded ${
                          signatureMode === "type"
                            ? "bg-zinc-800 text-white"
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        Digitar
                      </Button>
                    </div>
                  </div>

                  {signatureMode === "draw" ? (
                    <div className="flex flex-col gap-2 bg-zinc-950 border border-zinc-900 rounded-lg p-4">
                      <canvas
                        ref={canvasRef}
                        width={600}
                        height={150}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="bg-zinc-950 border border-dashed border-zinc-700 rounded w-full h-[150px] cursor-crosshair touch-none"
                      />
                      <div className="flex justify-between items-center text-[10px] text-zinc-500">
                        <span>Desenhe com mouse ou touch</span>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={clearCanvas}
                          className="h-6 text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                        >
                          <Eraser className="size-3" />
                          Limpar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 bg-zinc-950 border border-zinc-900 rounded-lg p-4">
                      <Input
                        value={typedSignature}
                        onChange={(e) => setTypedSignature(e.target.value)}
                        placeholder="Digite seu nome completo como assinatura"
                        className="bg-zinc-900 border-zinc-800 text-white text-sm"
                      />
                      {typedSignature && (
                        <div className="border border-dashed border-zinc-700 bg-zinc-950 rounded p-4 flex items-center justify-center min-h-[80px]">
                          <span className="font-serif italic text-2xl tracking-wide text-zinc-300 select-none">
                            {typedSignature}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {geoNotice && <p className="text-xs text-amber-400/90">{geoNotice}</p>}

                <Button
                  type="submit"
                  disabled={signMutation.isPending}
                  className="bg-[#09A3E9] text-white hover:bg-[#09A3E9]/90 font-bold py-3 mt-2 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-[#09A3E9]/20"
                >
                  <FileSignature className="size-4" />
                  {signMutation.isPending
                    ? "Registrando assinatura e evidências..."
                    : "Assinar contrato digitalmente"}
                </Button>
              </form>
            ) : contrato.status === "assinado" ? (
              <div className="mt-4 border-t border-zinc-800/80 pt-6 flex flex-col gap-6">
                <div className="flex flex-col items-center justify-center text-center gap-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-8">
                  <div className="size-12 rounded-full bg-emerald-500/10 border-2 border-emerald-500/25 flex items-center justify-center text-emerald-400">
                    <Check className="size-6 stroke-[3]" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-lg">Contrato assinado digitalmente</h3>
                    <p className="text-zinc-400 text-xs mt-1">
                      {isAdminView
                        ? "Dados da assinatura e trilha de auditoria abaixo."
                        : "Trilha de auditoria registrada com hash SHA-256 e carimbo de tempo (Brasília)."}
                    </p>
                  </div>
                  {contrato.assinado_em && (
                    <div className="text-zinc-500 text-[10px] font-mono mt-2">
                      Assinado em:{" "}
                      <ClientDate
                        iso={contrato.assinado_em}
                        timeZone="America/Sao_Paulo"
                        suffix="(Horário de Brasília)"
                      />
                    </div>
                  )}
                </div>

                {isAdminView && evidencias && (
                  <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <ShieldCheck className="size-4 text-emerald-400" />
                      Dados da assinatura
                    </h3>
                    <ContratoEvidenciasPanel evidencias={evidencias} />
                  </div>
                )}
              </div>
            ) : isAdminView && contrato.status === "pendente_financeiro" ? (
              <div className="mt-4 border-t border-zinc-800/80 pt-6 rounded-xl border border-violet-500/20 bg-violet-500/5 p-6 text-center">
                <p className="text-sm text-violet-300">
                  Este contrato aguarda revisão e validação pelo financeiro antes de ser liberado ao
                  cliente. Use o painel <strong>Contratos → Revisar e editar</strong>.
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ContratoSignaturePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-[#0B0B0B] text-zinc-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#09A3E9]" />
        </div>
      }
    >
      <ContratoPageContent params={params} />
    </Suspense>
  );
}
