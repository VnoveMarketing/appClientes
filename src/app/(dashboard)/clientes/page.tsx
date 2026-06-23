"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dbService } from "@/lib/db-service";
import { Cliente } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Plus,
  Search,
  Edit2,
  Trash2,
  FileText,
  FileCheck,
  Eye,
  ImageIcon,
} from "lucide-react";
import Link from "next/link";
import { useAuthUser, canAccessContratos } from "@/hooks/use-auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { normalizeHexColor } from "@/lib/cases";

export default function ClientesPage() {
  const queryClient = useQueryClient();
  const authUser = useAuthUser();
  const canViewContratos = canAccessContratos(authUser?.role);
  const [filterText, setFilterText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  // Form states
  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [corPrincipal, setCorPrincipal] = useState("#666666");
  const [categoriaCaseId, setCategoriaCaseId] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const heroInputRef = React.useRef<HTMLInputElement>(null);

  // TanStack Query fetching
  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["clientes"],
    queryFn: dbService.getClientes,
  });

  const { data: propostas = [] } = useQuery({
    queryKey: ["propostas"],
    queryFn: dbService.getPropostas,
  });

  const { data: contratos = [] } = useQuery({
    queryKey: ["contratos"],
    queryFn: dbService.getContratos,
    enabled: canViewContratos,
  });

  const { data: caseCategorias = [] } = useQuery({
    queryKey: ["case-categorias"],
    queryFn: dbService.getCaseCategorias,
  });

  // Mutations
  const addMutation = useMutation({
    mutationFn: dbService.addCliente,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Cliente> }) =>
      dbService.updateCliente(id, updates),
  });

  const deleteMutation = useMutation({
    mutationFn: dbService.deleteCliente,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      queryClient.invalidateQueries({ queryKey: ["propostas"] });
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
    },
  });

  const resetFormFields = () => {
    setSelectedCliente(null);
    setNome("");
    setSobrenome("");
    setEmail("");
    setTelefone("");
    setEmpresa("");
    setCorPrincipal("#666666");
    setCategoriaCaseId("");
    setLogoFile(null);
    setLogoPreview(null);
    setHeroFile(null);
    setHeroPreview(null);
  };

  const openAddModal = () => {
    resetFormFields();
    setIsModalOpen(true);
  };

  const openEditModal = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    const names = cliente.nome.split(" ");
    setNome(names[0] || "");
    setSobrenome(names.slice(1).join(" ") || "");
    setEmail(cliente.email);
    setTelefone(cliente.telefone || "");
    setEmpresa(cliente.empresa || "");
    setCorPrincipal(cliente.cor_principal ?? "#666666");
    setCategoriaCaseId(cliente.categoria_case_id ?? "");
    setLogoFile(null);
    setLogoPreview(cliente.logo_url ?? null);
    setHeroFile(null);
    setHeroPreview(cliente.hero_image_url ?? null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const corNormalizada = normalizeHexColor(corPrincipal);

    const payload = {
      nome: `${nome} ${sobrenome}`.trim(),
      email,
      telefone,
      empresa,
      cor_principal: corNormalizada,
      categoria_case_id: categoriaCaseId || null,
      status: (selectedCliente ? selectedCliente.status : "Ativa") as Cliente["status"],
      assinatura: (selectedCliente ? selectedCliente.assinatura : "active") as Cliente["assinatura"],
    };

    try {
      if (selectedCliente) {
        await updateMutation.mutateAsync({ id: selectedCliente.id, updates: payload });
        if (logoFile) {
          await dbService.uploadClienteLogo(selectedCliente.id, logoFile);
        }
        if (heroFile) {
          await dbService.uploadClienteHeroImage(selectedCliente.id, heroFile);
        }
      } else {
        const created = await addMutation.mutateAsync(payload);
        if (logoFile) {
          await dbService.uploadClienteLogo(created.id, logoFile);
        }
        if (heroFile) {
          await dbService.uploadClienteHeroImage(created.id, heroFile);
        }
        await queryClient.invalidateQueries({ queryKey: ["clientes"] });
        resetFormFields();
        closeModal();
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["clientes"] });
      closeModal();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao salvar cliente");
    }
  };

  const openFilePicker = (input: HTMLInputElement | null) => {
    if (input) input.value = "";
    input?.click();
  };

  const handleLogoChange = (file: File | undefined) => {
    if (!file) return;
    if (file.type !== "image/png") {
      alert("O logo do cliente deve ser PNG.");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleHeroChange = (file: File | undefined) => {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)) {
      alert("A imagem de fundo deve ser PNG, JPG ou WEBP.");
      return;
    }
    setHeroFile(file);
    setHeroPreview(URL.createObjectURL(file));
  };

  const handleDelete = (id: string) => {
    if (confirm("Deseja realmente excluir este cliente e todos os seus registros?")) {
      deleteMutation.mutate(id);
    }
  };

  const categoriaCaseLabel =
    categoriaCaseId === ""
      ? null
      : caseCategorias.find((cat) => cat.id === categoriaCaseId)?.nome ?? null;

  const filteredClientes = clientes.filter((c) => {
    const term = filterText.toLowerCase();
    return (
      c.nome.toLowerCase().includes(term) ||
      c.empresa.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term)
    );
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(filteredClientes.map((c) => c.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedRows([...selectedRows, id]);
    } else {
      setSelectedRows(selectedRows.filter((rowId) => rowId !== id));
    }
  };

  // Helper: Find proposal for client
  const getProposalForClient = (clientId: string) => {
    return propostas.find((p) => p.cliente_id === clientId);
  };

  // Helper: Find contract for client
  const getContractForClient = (clientId: string) => {
    return contratos.find((c) => c.cliente_id === clientId);
  };

  return (
    <div className="flex flex-col gap-6 w-full text-zinc-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Clientes</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Gerencie as empresas clientes e suas assinaturas.
          </p>
        </div>
        <Button
          onClick={openAddModal}
          className="bg-[#09A3E9] text-white hover:bg-[#09A3E9]/90 font-medium px-4 py-2 flex items-center gap-2 rounded-lg transition-all shadow-md shadow-[#09A3E9]/20"
        >
          <Plus className="size-4" />
          Adicionar Cliente
        </Button>
      </div>

      {/* Filter and Table Container */}
      <div className="bg-[#161616] border border-zinc-800/80 rounded-xl p-4 shadow-xl">
        <div className="flex items-center gap-2 max-w-sm mb-4 border border-zinc-800 rounded-lg px-3 py-2 bg-zinc-900 focus-within:border-[#09A3E9]/50 transition-colors">
          <Search className="size-4 text-zinc-500" />
          <input
            placeholder="Filtrar clientes..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-white placeholder-zinc-500 w-full"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
            Carregando clientes...
          </div>
        ) : filteredClientes.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
            Nenhum cliente encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-zinc-800 hover:bg-transparent">
                <TableRow className="border-b border-zinc-800 hover:bg-transparent">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        filteredClientes.length > 0 &&
                        selectedRows.length === filteredClientes.length
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                    Empresa
                  </TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                    Contato
                  </TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                    Plano
                  </TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                    Assinatura
                  </TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                    Cliente Desde
                  </TableHead>
                  <TableHead className="text-right text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                    Ações Rápidas
                  </TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClientes.map((cliente) => {
                  const prop = getProposalForClient(cliente.id);
                  const contr = getContractForClient(cliente.id);

                  return (
                    <TableRow
                      key={cliente.id}
                      className="border-b border-zinc-800/60 hover:bg-zinc-800/20 transition-colors"
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.includes(cliente.id)}
                          onCheckedChange={(checked) =>
                            handleSelectRow(cliente.id, !!checked)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="text-white font-semibold">{cliente.empresa}</span>
                          <span className="text-xs text-zinc-400">{cliente.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-300 text-sm">{cliente.email}</TableCell>
                      <TableCell>
                        <span className="text-xs text-zinc-300 font-medium">Business</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-semibold tracking-wide py-0.5 px-2 rounded-full uppercase ${
                            cliente.assinatura === "active"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-zinc-800 text-zinc-500 border border-zinc-700/50"
                          }`}
                        >
                          {cliente.assinatura}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-semibold tracking-wide py-0.5 px-2 rounded-full ${
                            cliente.status === "Ativa"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : cliente.status === "Bloqueada"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {cliente.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-400 text-xs">
                        {new Date(cliente.cliente_desde).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {prop ? (
                            <Link href={`/proposta/${prop.id}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-[#09A3E9]/20 text-[#09A3E9] hover:bg-[#09A3E9]/10"
                              >
                                <FileText className="size-3 mr-1" />
                                Proposta
                              </Button>
                            </Link>
                          ) : (
                            <span className="text-xs text-zinc-600 italic">Sem proposta</span>
                          )}

                          {contr && contr.status === "assinado" ? (
                            <Link href={`/contrato/${contr.id}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                              >
                                <FileCheck className="size-3 mr-1" />
                                Contrato
                              </Button>
                            </Link>
                          ) : contr ? (
                            <Link href={`/contrato/${contr.id}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                              >
                                <Eye className="size-3 mr-1" />
                                Analisar
                              </Button>
                            </Link>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" className="h-8 w-8 p-0 text-zinc-400 hover:text-white">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="size-4" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="bg-[#1c1c1e] border border-zinc-800 text-zinc-200">
                            <DropdownMenuItem
                              onClick={() => openEditModal(cliente)}
                              className="focus:bg-[#09A3E9]/10 focus:text-white cursor-pointer gap-2"
                            >
                              <Edit2 className="size-3.5" />
                              Alterar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(cliente.id)}
                              className="focus:bg-rose-500/10 focus:text-rose-400 text-rose-400 cursor-pointer gap-2"
                            >
                              <Trash2 className="size-3.5" />
                              Deletar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-zinc-500 mt-4 border-t border-zinc-800/50 pt-4">
          <span>{selectedRows.length} de {filteredClientes.length} contatos selecionados.</span>
          <div className="flex items-center gap-2">
            <span>Linhas por página: 10</span>
            <div className="flex gap-1">
              <Button disabled size="sm" className="h-7 px-2 bg-zinc-800 border-none text-zinc-500">1</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#161616] border border-zinc-800 text-white sm:max-w-(--container-lg)">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-white">
                {selectedCliente ? "Editar Cliente" : "Adicionar Novo Cliente"}
              </DialogTitle>
              <DialogDescription className="text-zinc-400 text-sm">
                Preencha os dados para cadastrar um novo cliente.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    placeholder="Nome"
                    className="bg-zinc-900 border-zinc-800 text-white text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sobrenome">Sobrenome</Label>
                  <Input
                    id="sobrenome"
                    value={sobrenome}
                    onChange={(e) => setSobrenome(e.target.value)}
                    required
                    placeholder="Sobrenome"
                    className="bg-zinc-900 border-zinc-800 text-white text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email do Dono</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="exemplo@empresa.com"
                  className="bg-zinc-900 border-zinc-800 text-white text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  required
                  placeholder="(00) 00000-0000"
                  className="bg-zinc-900 border-zinc-800 text-white text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="empresa">Nome da Empresa</Label>
                <Input
                  id="empresa"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  required
                  placeholder="Nome Fantasia / Razão Social"
                  className="bg-zinc-900 border-zinc-800 text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cor-principal">Cor principal</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="cor-principal-picker"
                      type="color"
                      value={normalizeHexColor(corPrincipal) ?? "#666666"}
                      onChange={(e) => setCorPrincipal(e.target.value.toUpperCase())}
                      className="h-10 w-12 rounded border border-zinc-800 bg-zinc-900 cursor-pointer"
                    />
                    <Input
                      id="cor-principal"
                      value={corPrincipal}
                      onChange={(e) => setCorPrincipal(e.target.value)}
                      placeholder="#RRGGBB"
                      className="bg-zinc-900 border-zinc-800 text-white text-sm font-mono"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Categoria de cases</Label>
                  <Select
                    value={categoriaCaseId || "none"}
                    onValueChange={(v) => setCategoriaCaseId(!v || v === "none" ? "" : v)}
                  >
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white text-sm">
                      <SelectValue placeholder="Selecione">
                        {categoriaCaseId === "" ? null : categoriaCaseLabel}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-[#1c1c1e] border-zinc-800 text-zinc-200">
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {caseCategorias.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Imagem de fundo da proposta</Label>
                <p className="text-xs text-zinc-500">
                  Usada na hero section da proposta comercial (PNG, JPG ou WEBP).
                </p>
                <input
                  ref={heroInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(e) => handleHeroChange(e.target.files?.[0])}
                />
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-zinc-700 text-zinc-300"
                    onClick={() => openFilePicker(heroInputRef.current)}
                  >
                    <ImageIcon className="size-4 mr-2" />
                    {heroPreview ? "Trocar imagem" : "Enviar imagem"}
                  </Button>
                  {heroPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={heroPreview}
                      alt="Imagem de fundo da proposta"
                      className="h-16 w-28 object-cover rounded border border-zinc-800"
                    />
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Logo do cliente (PNG)</Label>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png"
                  className="hidden"
                  onChange={(e) => handleLogoChange(e.target.files?.[0])}
                />
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-zinc-700 text-zinc-300"
                    onClick={() => openFilePicker(logoInputRef.current)}
                  >
                    <ImageIcon className="size-4 mr-2" />
                    {logoPreview ? "Trocar logo" : "Enviar logo"}
                  </Button>
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoPreview}
                      alt="Logo do cliente"
                      className="h-12 max-w-[120px] object-contain rounded border border-zinc-800 bg-zinc-950 px-2"
                    />
                  ) : null}
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={closeModal}
                className="text-zinc-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#09A3E9] text-white hover:bg-[#09A3E9]/90 font-medium rounded-lg"
                disabled={addMutation.isPending || updateMutation.isPending}
              >
                {addMutation.isPending
                  ? "Cadastrando..."
                  : updateMutation.isPending
                  ? "Salvando..."
                  : selectedCliente
                  ? "Salvar Alterações"
                  : "Cadastrar cliente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
