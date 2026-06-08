"use client";

import React, { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { dbService } from "@/lib/db-service";
import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PropostaSucessoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: proposta } = useQuery({
    queryKey: ["proposta", id],
    queryFn: () => dbService.getPropostaById(id),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: dbService.getClientes,
  });

  const client = proposalLoadedClient();

  function proposalLoadedClient() {
    if (!proposta) return null;
    return clientes.find((c) => c.id === proposta.cliente_id) || null;
  }

  const clientName = client ? client.empresa : "sua empresa";

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-zinc-100 flex flex-col justify-center items-center py-12 px-6 font-sans">
      <Card className="bg-[#161616] border border-zinc-800/80 max-w-md w-full shadow-2xl p-8 relative overflow-hidden">
        {/* Sky blue accent glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#09A3E9]/10 rounded-full blur-2xl pointer-events-none" />

        <CardContent className="p-0 flex flex-col items-center text-center gap-6">
          {/* Animated/Glowing Check Icon */}
          <div className="size-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10 animate-pulse">
            <Check className="size-8 stroke-[3]" />
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">proposta aceita!</h1>
            <p className="text-zinc-400 text-sm leading-relaxed mt-2">
              A proposta comercial para a <strong className="text-white">{clientName}</strong> foi validada e aceita com sucesso.
            </p>
            <p className="text-zinc-550 text-xs leading-relaxed mt-1">
              Nosso time jurídico e financeiro está gerando o contrato de prestação de serviços. Em breve, você receberá o link para a assinatura digital.
            </p>
          </div>

          <div className="w-full border-t border-zinc-800/60 pt-6 mt-2">
            <Link href={`/proposta/${id}`}>
              <Button variant="outline" className="w-full text-zinc-400 hover:text-white border-zinc-800 hover:bg-zinc-800/40 text-xs">
                Visualizar Proposta Salva
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      
      <div className="text-[10px] text-zinc-650 tracking-wider font-mono mt-8 uppercase select-none">
        Agência de Marketing V9nove
      </div>
    </div>
  );
}
