"use client";

import React, { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dbService } from "@/lib/db-service";
import type { CasePortfolio } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Edit2, ImageIcon, ExternalLink } from "lucide-react";

export default function CasesPage() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<CasePortfolio | null>(null);
  const [nome, setNome] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [link, setLink] = useState("");
  const [ordem, setOrdem] = useState(0);
  const [imagemUrl, setImagemUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [filterCategoria, setFilterCategoria] = useState("all");

  const { data: categorias = [] } = useQuery({
    queryKey: ["case-categorias"],
    queryFn: dbService.getCaseCategorias,
  });

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["cases", filterCategoria],
    queryFn: () =>
      dbService.getCases(filterCategoria === "all" ? undefined : filterCategoria),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: nome.trim(),
        imagem_url: imagemUrl,
        categoria_id: categoriaId,
        link: link.trim() || null,
        ordem,
      };
      if (editing) return dbService.updateCase(editing.id, payload);
      return dbService.addCase(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      setIsModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: dbService.deleteCase,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cases"] }),
  });

  const resetForm = () => {
    setEditing(null);
    setNome("");
    setCategoriaId("");
    setLink("");
    setOrdem(0);
    setImagemUrl("");
  };

  const openCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (item: CasePortfolio) => {
    setEditing(item);
    setNome(item.nome);
    setCategoriaId(item.categoria_id);
    setLink(item.link ?? "");
    setOrdem(item.ordem);
    setImagemUrl(item.imagem_url);
    setIsModalOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const { url } = await dbService.uploadCaseImagem(file);
      setImagemUrl(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  const filterCategoriaLabel =
    filterCategoria === "all"
      ? "Todas"
      : categorias.find((cat) => cat.id === filterCategoria)?.nome ?? null;

  const categoriaLabel =
    categoriaId === ""
      ? null
      : categorias.find((cat) => cat.id === categoriaId)?.nome ?? null;

  return (
    <div className="flex flex-col gap-6 w-full text-zinc-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Cases</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Portfólio exibido nas propostas conforme a categoria vinculada ao cliente.
          </p>
        </div>
        <Button
          onClick={openCreate}
          disabled={categorias.length === 0}
          className="bg-[#09A3E9] text-white hover:bg-[#09A3E9]/90 font-medium px-4 py-2 flex items-center gap-2 rounded-lg"
        >
          <Plus className="size-4" />
          Novo case
        </Button>
      </div>

      {categorias.length === 0 && (
        <p className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
          Cadastre ao menos uma categoria em Configurações → Categorias de Cases antes de adicionar cases.
        </p>
      )}

      <div className="bg-[#161616] border border-zinc-800/80 rounded-xl p-4 shadow-xl">
        <div className="mb-4 max-w-xs">
          <Label className="text-zinc-400 text-xs">Filtrar por categoria</Label>
          <Select value={filterCategoria} onValueChange={(v) => setFilterCategoria(v ?? "all")}>
            <SelectTrigger className="mt-1 bg-zinc-900 border-zinc-800 text-white">
              <SelectValue placeholder="Todas">{filterCategoriaLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-[#1c1c1e] border-zinc-800 text-zinc-200">
              <SelectItem value="all">Todas</SelectItem>
              {categorias.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="text-sm text-zinc-500 py-8 text-center">Carregando cases...</p>
        ) : cases.length === 0 ? (
          <p className="text-sm text-zinc-500 py-8 text-center">Nenhum case cadastrado.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cases.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/30"
              >
                <div className="aspect-[4/3] relative bg-zinc-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imagem_url}
                    alt={item.nome}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-white">{item.nome}</p>
                      <p className="text-xs text-zinc-500">
                        {item.case_categorias?.nome ?? "Sem categoria"}
                      </p>
                    </div>
                    {item.link ? (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#09A3E9] hover:text-[#09A3E9]/80"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    ) : null}
                  </div>
                  <div className="flex gap-2 mt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 flex-1 border-zinc-700 text-zinc-300"
                      onClick={() => openEdit(item)}
                    >
                      <Edit2 className="size-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                      onClick={() => {
                        if (confirm("Excluir este case?")) deleteMutation.mutate(item.id);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#161616] border border-zinc-800 text-white sm:max-w-lg">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!imagemUrl) {
                alert("Envie a imagem do case.");
                return;
              }
              saveMutation.mutate();
            }}
          >
            <DialogHeader>
              <DialogTitle>{editing ? "Editar case" : "Novo case"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="case-nome">Nome</Label>
                <Input
                  id="case-nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  className="mt-1.5 bg-zinc-900 border-zinc-800 text-white"
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={categoriaId} onValueChange={(v) => setCategoriaId(v ?? "")} required>
                  <SelectTrigger className="mt-1.5 bg-zinc-900 border-zinc-800 text-white">
                    <SelectValue placeholder="Selecione">{categoriaLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-[#1c1c1e] border-zinc-800 text-zinc-200">
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="case-link">Link (opcional)</Label>
                <Input
                  id="case-link"
                  type="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://"
                  className="mt-1.5 bg-zinc-900 border-zinc-800 text-white"
                />
              </div>
              <div>
                <Label htmlFor="case-ordem">Ordem</Label>
                <Input
                  id="case-ordem"
                  type="number"
                  min={0}
                  value={ordem}
                  onChange={(e) => setOrdem(Number(e.target.value))}
                  className="mt-1.5 bg-zinc-900 border-zinc-800 text-white"
                />
              </div>
              <div>
                <Label>Imagem</Label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
                <div className="mt-1.5 flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-zinc-700 text-zinc-300"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                  >
                    <ImageIcon className="size-4 mr-2" />
                    {uploading ? "Enviando..." : "Enviar imagem"}
                  </Button>
                  {imagemUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagemUrl} alt="Preview" className="h-12 w-16 object-cover rounded border border-zinc-700" />
                  ) : null}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-[#09A3E9] text-white" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
