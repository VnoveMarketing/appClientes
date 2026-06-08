"use client";

import React, { useState, use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dbService } from "@/lib/db-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, AlertTriangle, Building, Mail, Phone, MapPin, Briefcase } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AceitarPropostaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  // Form states
  const [empresaNome, setEmpresaNome] = useState("");
  const [emailCorporativo, setEmailCorporativo] = useState("");
  const [telefonePrincipal, setTelefonePrincipal] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [ramoAtividade, setRamoAtividade] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [responsavelLegal, setResponsavelLegal] = useState("");

  // Tanstack Queries
  const { data: proposta, isLoading, error } = useQuery({
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

  // Effect to pre-populate from client initial data
  React.useEffect(() => {
    if (client) {
      setEmpresaNome(client.empresa || "");
      setEmailCorporativo(client.email || "");
      setTelefonePrincipal(client.telefone || "");
      setResponsavelLegal(client.nome || "");
    }
  }, [client]);

  // Mutation to accept proposal & update client details
  const acceptMutation = useMutation({
    mutationFn: async (payload: {
      clienteId: string;
      clientUpdates: {
        empresa: string;
        email: string;
        telefone: string;
        cnpj: string;
        ramo_atividade: string;
        cidade: string;
        estado: string;
        nome: string;
      };
    }) => {
      // 1. Update client detailed registration data
      await dbService.updateCliente(payload.clienteId, payload.clientUpdates);
      // 2. Update proposal status to 'aceita'
      await dbService.updateProposta(id, { status: "aceita" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposta", id] });
      queryClient.invalidateQueries({ queryKey: ["propostas"] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      router.push(`/proposta/${id}/sucesso`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0B0B0B] text-zinc-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#09A3E9]" />
      </div>
    );
  }

  if (error || !proposta || !client) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0B0B0B] text-zinc-400">
        <div className="flex flex-col items-center gap-2 text-center max-w-md px-6">
          <AlertTriangle className="size-12 text-rose-500" />
          <span className="text-lg font-semibold text-white">Erro ao carregar formulário</span>
          <span className="text-sm text-zinc-500">Dados da proposta ou cliente inválidos.</span>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    acceptMutation.mutate({
      clienteId: client.id,
      clientUpdates: {
        empresa: empresaNome,
        email: emailCorporativo,
        telefone: telefonePrincipal,
        cnpj,
        ramo_atividade: ramoAtividade,
        cidade,
        estado,
        nome: responsavelLegal,
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-zinc-100 py-12 px-6 flex flex-col justify-center items-center relative font-sans">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#09A3E9]/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="w-full max-w-2xl flex flex-col gap-6">
        <Link href={`/proposta/${id}`} className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors w-fit">
          <ArrowLeft className="size-3.5" />
          Voltar para a Proposta
        </Link>

        <Card className="bg-[#161616] border border-zinc-800/80 shadow-2xl p-6 md:p-8">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="size-6 text-[#09A3E9]" />
              Aceitar Proposta e Concluir Cadastro
            </CardTitle>
            <CardDescription className="text-zinc-400 text-sm mt-2">
              Precisamos de alguns dados cadastrais adicionais para emitir o contrato oficial de prestação de serviços.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Grid 1: Basic legal details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="empresaNome" className="text-zinc-300 text-xs flex items-center gap-1.5">
                  <Building className="size-3.5 text-zinc-500" /> Nome da Empresa (Razão Social / Fantasia) *
                </Label>
                <Input
                  id="empresaNome"
                  required
                  value={empresaNome}
                  onChange={(e) => setEmpresaNome(e.target.value)}
                  placeholder="Empresa Exemplo LTDA"
                  className="bg-zinc-900 border-zinc-800 text-white text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cnpj" className="text-zinc-300 text-xs flex items-center gap-1.5">
                  <Building className="size-3.5 text-zinc-500" /> CNPJ *
                </Label>
                <Input
                  id="cnpj"
                  required
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="bg-zinc-900 border-zinc-800 text-white text-sm"
                />
              </div>
            </div>

            {/* Grid 2: Contacts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-zinc-300 text-xs flex items-center gap-1.5">
                  <Mail className="size-3.5 text-zinc-500" /> E-mail Corporativo *
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={emailCorporativo}
                  onChange={(e) => setEmailCorporativo(e.target.value)}
                  placeholder="financeiro@empresa.com"
                  className="bg-zinc-900 border-zinc-800 text-white text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="telefone" className="text-zinc-300 text-xs flex items-center gap-1.5">
                  <Phone className="size-3.5 text-zinc-500" /> Telefone Principal *
                </Label>
                <Input
                  id="telefone"
                  required
                  value={telefonePrincipal}
                  onChange={(e) => setTelefonePrincipal(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="bg-zinc-900 border-zinc-800 text-white text-sm"
                />
              </div>
            </div>

            {/* Grid 3: Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cidade" className="text-zinc-300 text-xs flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-zinc-500" /> Cidade *
                </Label>
                <Input
                  id="cidade"
                  required
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Limeira"
                  className="bg-zinc-900 border-zinc-800 text-white text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="estado" className="text-zinc-300 text-xs flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-zinc-500" /> Estado *
                </Label>
                <Input
                  id="estado"
                  required
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  placeholder="SP"
                  maxLength={2}
                  className="bg-zinc-900 border-zinc-800 text-white text-sm"
                />
              </div>
            </div>

            {/* Grid 4: Activity Sector and Signatory */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ramo" className="text-zinc-300 text-xs flex items-center gap-1.5">
                  <Briefcase className="size-3.5 text-zinc-500" /> Ramo de Atividade *
                </Label>
                <Input
                  id="ramo"
                  required
                  value={ramoAtividade}
                  onChange={(e) => setRamoAtividade(e.target.value)}
                  placeholder="Varejo, Tecnologia, Educação..."
                  className="bg-zinc-900 border-zinc-800 text-white text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="responsavel" className="text-zinc-300 text-xs flex items-center gap-1.5">
                  <Building className="size-3.5 text-zinc-500" /> Representante Legal / Assinante *
                </Label>
                <Input
                  id="responsavel"
                  required
                  value={responsavelLegal}
                  onChange={(e) => setResponsavelLegal(e.target.value)}
                  placeholder="Nome do sócio / diretor"
                  className="bg-zinc-900 border-zinc-800 text-white text-sm"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={acceptMutation.isPending}
              className="bg-[#09A3E9] text-white hover:bg-[#09A3E9]/90 font-bold py-3 mt-4 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-[#09A3E9]/20"
            >
              {acceptMutation.isPending ? "Confirmando Aceite..." : "Aceitar Proposta & Solicitar Contrato"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
