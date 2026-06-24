"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dbService } from "@/lib/db-service";
import type { ContratoModelo } from "@/lib/types";
import { CONTRATO_PLACEHOLDER_ITEMS } from "@/lib/contract-template";
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
import { Plus, Trash2, Edit2, Upload, CheckCircle2 } from "lucide-react";

export default function ContratoModelosPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContratoModelo | null>(null);
  const [nome, setNome] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [arquivoNome, setArquivoNome] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [ativo, setAtivo] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { data: modelos = [], isLoading } = useQuery({
    queryKey: ["contrato-modelos"],
    queryFn: dbService.getContratoModelos,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nome,
        conteudo_template: conteudo,
        arquivo_nome: arquivoNome,
        mime_type: mimeType,
        ativo,
      };
      if (editing) return dbService.updateContratoModelo(editing.id, payload);
      return dbService.addContratoModelo(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contrato-modelos"] });
      setIsModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: dbService.deleteContratoModelo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contrato-modelos"] }),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => dbService.updateContratoModelo(id, { ativo: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contrato-modelos"] }),
  });

  const openCreate = () => {
    setEditing(null);
    setNome("");
    setConteudo("");
    setArquivoNome(null);
    setMimeType(null);
    setAtivo(modelos.length === 0);
    setIsModalOpen(true);
  };

  const openEdit = (modelo: ContratoModelo) => {
    setEditing(modelo);
    setNome(modelo.nome);
    setConteudo(modelo.conteudo_template);
    setArquivoNome(modelo.arquivo_nome);
    setMimeType(modelo.mime_type);
    setAtivo(modelo.ativo);
    setIsModalOpen(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await dbService.uploadContratoModelo(file);
      setConteudo(result.conteudo_template);
      setArquivoNome(result.arquivo_nome);
      setMimeType(result.mime_type);
      if (!nome) setNome(file.name.replace(/\.[^.]+$/, ""));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao processar arquivo");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full text-zinc-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Modelo de Contrato</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Edite as cláusulas do contrato. Use placeholders para dados do cliente e da proposta.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-[#09A3E9] text-white hover:bg-[#09A3E9]/90">
          <Plus className="size-4 mr-2" />
          Novo Modelo
        </Button>
      </div>

      <div className="bg-[#161616] border border-zinc-800/80 rounded-xl p-4 shadow-xl">
        {isLoading ? (
          <p className="text-zinc-500 text-sm py-8 text-center">Carregando...</p>
        ) : modelos.length === 0 ? (
          <p className="text-zinc-500 text-sm py-8 text-center">Nenhum modelo cadastrado.</p>
        ) : (
          <div className="grid gap-3">
            {modelos.map((modelo) => (
              <div
                key={modelo.id}
                className="flex items-start justify-between gap-4 p-4 rounded-lg border border-zinc-800 bg-zinc-950/50"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{modelo.nome}</h3>
                    {modelo.ativo && (
                      <span className="text-[10px] uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        Ativo
                      </span>
                    )}
                  </div>
                  {modelo.arquivo_nome && (
                    <p className="text-xs text-zinc-500 mt-1">Arquivo: {modelo.arquivo_nome}</p>
                  )}
                  <p className="text-xs text-zinc-600 mt-2 line-clamp-2 whitespace-pre-wrap">
                    {modelo.conteudo_template.slice(0, 200)}...
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {!modelo.ativo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => activateMutation.mutate(modelo.id)}
                      title="Definir como ativo"
                    >
                      <CheckCircle2 className="size-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => openEdit(modelo)}>
                    <Edit2 className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-400"
                    onClick={() => {
                      if (confirm(`Excluir modelo "${modelo.nome}"?`)) deleteMutation.mutate(modelo.id);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#161616] border border-zinc-800 text-white sm:max-w-(--container-xl) max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Modelo" : "Novo Modelo de Contrato"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-zinc-300">Nome do modelo *</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="bg-zinc-900 border-zinc-800"
              />
            </div>

            <div className="border border-dashed border-zinc-700 rounded-lg p-4 bg-zinc-950/50">
              <Label className="text-xs text-zinc-300 mb-2 block">
                Importar de PDF, DOCX ou TXT
              </Label>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm cursor-pointer hover:border-[#09A3E9]/40">
                <Upload className="size-4 text-[#09A3E9]" />
                {isUploading ? "Processando..." : "Enviar arquivo"}
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  hidden
                  onChange={handleUpload}
                  disabled={isUploading}
                />
              </label>
              {arquivoNome && (
                <p className="text-xs text-zinc-500 mt-2">Importado: {arquivoNome}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-zinc-300">Conteúdo do contrato (cláusulas)</Label>
              <textarea
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                rows={16}
                className="bg-zinc-900 border border-zinc-800 rounded-md p-3 text-white text-sm font-mono outline-none focus:border-[#09A3E9]/50 w-full resize-y"
                placeholder="Cole ou edite o texto do contrato..."
              />
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-xs text-zinc-400 mb-2">Placeholders disponíveis:</p>
              <div className="flex flex-wrap gap-1.5">
                {CONTRATO_PLACEHOLDER_ITEMS.map(({ token, label }) => (
                  <span
                    key={token}
                    title={label}
                    className="inline-flex items-center gap-1 rounded bg-zinc-900 px-1.5 py-0.5"
                  >
                    <code className="text-[10px] text-[#09A3E9]">{token}</code>
                    <span className="text-[10px] text-zinc-500">{label}</span>
                  </span>
                ))}
                <span className="inline-flex items-center gap-1 rounded bg-zinc-900 px-1.5 py-0.5">
                  <code className="text-[10px] text-zinc-500">{"{{campo.chave}}"}</code>
                  <span className="text-[10px] text-zinc-500">Campo do tipo de serviço</span>
                </span>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="rounded"
              />
              Usar como modelo ativo na geração de contratos
            </label>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!nome.trim() || !conteudo.trim() || saveMutation.isPending}
              className="bg-[#09A3E9] text-white"
            >
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
