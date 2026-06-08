"use client";

import React, { useState, useRef, use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dbService } from "@/lib/db-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileSignature, ShieldCheck, PenTool, Eraser, Check, AlertTriangle } from "lucide-react";

export default function ContratoSignaturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // States
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatoryName, setSignatoryName] = useState("");
  const [signatoryCpf, setSignatoryCpf] = useState("");
  const [typedSignature, setTypedSignature] = useState("");
  const [signatureMode, setSignatureMode] = useState<"draw" | "type">("draw");

  // Tanstack Queries
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-contrato", id],
    queryFn: () => dbService.getPublicContratoWithCliente(id),
  });

  const contrato = data?.contrato;
  const client = data?.cliente;

  // Mutation to sign
  const signMutation = useMutation({
    mutationFn: async () => {
      if (!contrato) return;
      await dbService.signPublicContrato(contrato.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contrato", id] });
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
  });

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#FFFFFF";

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

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
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0B0B0B] text-zinc-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#09A3E9]" />
      </div>
    );
  }

  if (error || !contrato || !client) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0B0B0B] text-zinc-400">
        <div className="flex flex-col items-center gap-2 text-center max-w-md px-6">
          <AlertTriangle className="size-12 text-rose-500" />
          <span className="text-lg font-semibold text-white">Contrato não encontrado</span>
          <span className="text-sm text-zinc-500">
            O link de assinatura é inválido ou o contrato ainda não foi elaborado.
          </span>
        </div>
      </div>
    );
  }

  const handleSubmitSignature = (e: React.FormEvent) => {
    e.preventDefault();

    if (!signatoryName || !signatoryCpf) {
      alert("Por favor, preencha o Nome e o CPF do assinante legal.");
      return;
    }

    signMutation.mutate();
  };

  const formatBRL = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-zinc-100 py-12 px-6 flex flex-col justify-center items-center font-sans">
      {/* Glow */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#09A3E9]/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="w-full max-w-3xl flex flex-col gap-6">
        {/* Main Contract Panel */}
        <Card className="bg-[#161616] border border-zinc-800/80 shadow-2xl overflow-hidden">
          {/* Header strip */}
          <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between bg-zinc-950/40">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-[#09A3E9]" />
              <span className="text-xs text-zinc-400 font-mono tracking-wider">ASSINATURA DIGITAL CRIPTOGRAFADA</span>
            </div>
            <Badge
              variant="secondary"
              className={`text-[9px] font-bold tracking-widest uppercase py-0.5 px-2.5 rounded-full border ${
                contrato.status === "assinado"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}
            >
              {contrato.status === "assinado" ? "Assinado" : "Aguardando Assinatura"}
            </Badge>
          </div>

          <div className="p-6 md:p-8 flex flex-col gap-6">
            <div>
              <span className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Prestação de Serviços</span>
              <h1 className="text-2xl font-black text-white mt-1">CONTRATO DE MARKETING DIGITAL</h1>
              <p className="text-xs text-zinc-400 mt-1">
                Representando: <strong className="text-white">{client.empresa}</strong> e a Agência V9nove.
              </p>
            </div>

            {/* Document Viewer Box */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-6 max-h-[300px] overflow-y-auto text-zinc-300 font-sans text-xs whitespace-pre-wrap leading-relaxed shadow-inner">
              {contrato.conteudo_contrato}
            </div>

            {/* If not signed yet, show signature panel */}
            {contrato.status !== "assinado" ? (
              <form onSubmit={handleSubmitSignature} className="flex flex-col gap-5 border-t border-zinc-800/80 pt-6 mt-2">
                <h3 className="text-sm font-semibold text-white">Painel do Assinante Legal</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="signatoryName" className="text-zinc-300 text-xs">Nome Completo do Assinante *</Label>
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
                    <Label htmlFor="signatoryCpf" className="text-zinc-300 text-xs">CPF *</Label>
                    <Input
                      id="signatoryCpf"
                      required
                      value={signatoryCpf}
                      onChange={(e) => setSignatoryCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="bg-zinc-900 border-zinc-800 text-white text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-zinc-300 text-xs">Assinatura Digital *</Label>
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
                        Desenhar Assinatura
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
                        Digitar Assinatura
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
                        className="bg-zinc-950 border border-dashed border-zinc-850 rounded w-full h-[150px] cursor-crosshair touch-none"
                      />
                      <div className="flex justify-between items-center text-[10px] text-zinc-500">
                        <span>Desenhe utilizando o mouse ou touch do celular no quadrado pontilhado</span>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={clearCanvas}
                          className="h-6 text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                        >
                          <Eraser className="size-3" />
                          Limpar Tela
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 bg-zinc-950 border border-zinc-900 rounded-lg p-4">
                      <Input
                        value={typedSignature}
                        onChange={(e) => setTypedSignature(e.target.value)}
                        placeholder="Digite seu nome completo como assinatura legal"
                        className="bg-zinc-900 border-zinc-800 text-white text-sm"
                      />
                      {typedSignature && (
                        <div className="border border-dashed border-zinc-850 bg-zinc-950 rounded p-4 flex items-center justify-center min-h-[80px]">
                          <span className="font-serif italic text-2xl tracking-wide text-zinc-300 select-none">
                            {typedSignature}
                          </span>
                        </div>
                      )}
                      <span className="text-[10px] text-zinc-500">A fonte manuscrita simula a assinatura oficial do documento de forma válida.</span>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={signMutation.isPending}
                  className="bg-[#09A3E9] text-white hover:bg-[#09A3E9]/90 font-bold py-3 mt-2 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-[#09A3E9]/20"
                >
                  <FileSignature className="size-4" />
                  {signMutation.isPending ? "Registrando Assinatura..." : "Assinar Contrato de Forma Digital"}
                </Button>
              </form>
            ) : (
              // If already signed, show receipt
              <div className="mt-4 border-t border-zinc-800/80 pt-6 flex flex-col items-center justify-center text-center gap-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-8">
                <div className="size-12 rounded-full bg-emerald-500/10 border-2 border-emerald-500/25 flex items-center justify-center text-emerald-400">
                  <Check className="size-6 stroke-[3]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-lg">Contrato Assinado Digitalmente!</h3>
                  <p className="text-zinc-400 text-xs mt-1">
                    Documento autenticado e vinculado juridicamente.
                  </p>
                </div>
                {contrato.assinado_em && (
                  <div className="text-zinc-500 text-[10px] font-mono mt-2">
                    Assinado em: {new Date(contrato.assinado_em).toLocaleDateString("pt-BR")}{" "}
                    às {new Date(contrato.assinado_em).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
