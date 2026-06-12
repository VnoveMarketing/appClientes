"use client";

import React, { useState, use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dbService } from "@/lib/db-service";
import Link from "next/link";
import { AgencyLogo } from "@/components/agency-brand";
import { useRouter } from "next/navigation";

export default function AceitarPropostaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [empresaNome, setEmpresaNome] = useState("");
  const [emailCorporativo, setEmailCorporativo] = useState("");
  const [telefonePrincipal, setTelefonePrincipal] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [ramoAtividade, setRamoAtividade] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [responsavelLegal, setResponsavelLegal] = useState("");
  const [cartaoPreview, setCartaoPreview] = useState<{
    type: "image" | "pdf";
    src: string;
    name: string;
  } | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-proposta", id],
    queryFn: () => dbService.getPublicPropostaWithCliente(id),
  });

  const proposta = data?.proposta;
  const client = data?.cliente;

  React.useEffect(() => {
    if (client) {
      setEmpresaNome(client.empresa || "");
      setEmailCorporativo(client.email || "");
      setTelefonePrincipal(client.telefone || "");
      setResponsavelLegal(client.nome || "");
      setCnpj(client.cnpj || "");
      setRamoAtividade(client.ramo_atividade || "");
      setCidade(client.cidade || "");
      setEstado(client.estado || "");
    }
  }, [client]);

  const applyExtractedData = (extracted: {
    empresa?: string;
    cnpj?: string;
    email?: string;
    telefone?: string;
    cidade?: string;
    estado?: string;
    ramo_atividade?: string;
    nome?: string;
  }) => {
    if (extracted.empresa) setEmpresaNome(extracted.empresa);
    if (extracted.cnpj) setCnpj(extracted.cnpj);
    if (extracted.email) setEmailCorporativo(extracted.email);
    if (extracted.telefone) setTelefonePrincipal(extracted.telefone);
    if (extracted.cidade) setCidade(extracted.cidade);
    if (extracted.estado) setEstado(extracted.estado.slice(0, 2).toUpperCase());
    if (extracted.ramo_atividade) setRamoAtividade(extracted.ramo_atividade);
    if (extracted.nome) setResponsavelLegal(extracted.nome);
  };

  const isCartaoFileAllowed = (file: File) => {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];
    if (allowedTypes.includes(file.type)) return true;

    const name = file.name.toLowerCase();
    return /\.(pdf|jpe?g|png|webp)$/.test(name);
  };

  const isPdfFile = (file: File) =>
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  const handleCartaoSocialUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isCartaoFileAllowed(file)) {
      setExtractError("Envie um PDF do cartão CNPJ (recomendado) ou imagem (JPG, PNG, WEBP).");
      return;
    }

    setExtractError(null);
    setIsExtracting(true);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
        reader.readAsDataURL(file);
      });

      setCartaoPreview({
        type: isPdfFile(file) ? "pdf" : "image",
        src: dataUrl,
        name: file.name,
      });

      const extracted = await dbService.extractCartaoSocial(dataUrl);
      applyExtractedData(extracted);
    } catch (err) {
      setExtractError(
        err instanceof Error ? err.message : "Não foi possível extrair os dados do documento."
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const acceptMutation = useMutation({
    mutationFn: async (payload: {
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
      await dbService.acceptPublicProposta(id, payload.clientUpdates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposta", id] });
      queryClient.invalidateQueries({ queryKey: ["propostas"] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      router.push(`/proposta/${id}/sucesso`);
    },
  });

  if (isLoading) {
    return (
      <div className="prop-center-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="prop-spinner" />
          <span style={{ fontSize: 14 }}>Carregando formulário...</span>
        </div>
      </div>
    );
  }

  if (error || !proposta || !client) {
    return (
      <div className="prop-center-screen">
        <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
          <p className="prop-sec-title" style={{ fontSize: 36, marginBottom: 12 }}>
            ERRO AO <em>CARREGAR</em>
          </p>
          <p className="prop-sec-desc" style={{ fontSize: 14 }}>
            Dados da proposta ou cliente inválidos.
          </p>
          <Link href={`/proposta/${id}`} className="prop-btn prop-btn-ghost" style={{ marginTop: 24 }}>
            Voltar
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    acceptMutation.mutate({
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
    <>
      <nav className="prop-nav">
        <Link href={`/proposta/${id}`} className="prop-nav-logo">
          <AgencyLogo height={32} />
        </Link>
        <span className="prop-nav-date">Aceite da proposta</span>
      </nav>

      <div className="prop-form-wrap">
        <Link href={`/proposta/${id}`} className="prop-back-link">
          ← Voltar para a proposta
        </Link>

        <div className="prop-form-card">
          <div className="prop-s-label">05 — Aceite</div>
          <h1 className="prop-form-title">
            CONCLUIR <em style={{ color: "var(--prop-gray-500)", fontStyle: "normal" }}>CADASTRO</em>
          </h1>
          <p className="prop-form-desc">
            Anexe o cartão CNPJ em PDF para preenchimento automático via IA, ou complete os dados
            manualmente para gerar o contrato oficial.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="prop-upload-zone">
              <label htmlFor="cartaoSocial" className="prop-upload-label">
                Cartão CNPJ / documento da empresa
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
                <label htmlFor="cartaoSocial" className="prop-upload-btn">
                  Anexar PDF ou imagem
                </label>
                <input
                  id="cartaoSocial"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp,.pdf"
                  hidden
                  onChange={handleCartaoSocialUpload}
                  disabled={isExtracting}
                />
                {cartaoPreview?.type === "image" && (
                  <img
                    src={cartaoPreview.src}
                    alt="Documento anexado"
                    style={{
                      height: 80,
                      border: "1px solid var(--prop-line)",
                      objectFit: "contain",
                      background: "#fff",
                    }}
                  />
                )}
                {cartaoPreview?.type === "pdf" && (
                  <div className="prop-upload-preview-pdf">
                    <span>PDF</span>
                    {cartaoPreview.name}
                  </div>
                )}
              </div>
              <p className="prop-upload-hint">
                Formato recomendado: PDF do cartão CNPJ. A IA extrai os dados e preenche os campos
                abaixo automaticamente.
              </p>
              {isExtracting && (
                <div className="prop-extracting-status" role="status" aria-live="polite">
                  <div className="prop-spinner" aria-hidden="true" />
                  <div className="prop-extracting-text">
                    <strong>Extraindo dados</strong>
                    A IA está lendo o documento e preenchendo os campos abaixo...
                  </div>
                </div>
              )}
              {extractError && <p className="prop-error-text">{extractError}</p>}
            </div>

            <div className={`prop-form-grid${isExtracting ? " is-extracting" : ""}`}>
              <div className="prop-field">
                <label htmlFor="empresaNome" className="prop-field-label">
                  Nome da empresa *
                </label>
                <input
                  id="empresaNome"
                  required
                  value={empresaNome}
                  onChange={(e) => setEmpresaNome(e.target.value)}
                  placeholder="Empresa Exemplo LTDA"
                  className="prop-input"
                />
              </div>
              <div className="prop-field">
                <label htmlFor="cnpj" className="prop-field-label">
                  CNPJ *
                </label>
                <input
                  id="cnpj"
                  required
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="prop-input"
                />
              </div>
              <div className="prop-field">
                <label htmlFor="email" className="prop-field-label">
                  E-mail corporativo *
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={emailCorporativo}
                  onChange={(e) => setEmailCorporativo(e.target.value)}
                  placeholder="financeiro@empresa.com"
                  className="prop-input"
                />
              </div>
              <div className="prop-field">
                <label htmlFor="telefone" className="prop-field-label">
                  Telefone principal *
                </label>
                <input
                  id="telefone"
                  required
                  value={telefonePrincipal}
                  onChange={(e) => setTelefonePrincipal(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="prop-input"
                />
              </div>
              <div className="prop-field">
                <label htmlFor="cidade" className="prop-field-label">
                  Cidade *
                </label>
                <input
                  id="cidade"
                  required
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Limeira"
                  className="prop-input"
                />
              </div>
              <div className="prop-field">
                <label htmlFor="estado" className="prop-field-label">
                  Estado *
                </label>
                <input
                  id="estado"
                  required
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  placeholder="SP"
                  maxLength={2}
                  className="prop-input"
                />
              </div>
              <div className="prop-field">
                <label htmlFor="ramo" className="prop-field-label">
                  Ramo de atividade *
                </label>
                <input
                  id="ramo"
                  required
                  value={ramoAtividade}
                  onChange={(e) => setRamoAtividade(e.target.value)}
                  placeholder="Varejo, Tecnologia..."
                  className="prop-input"
                />
              </div>
              <div className="prop-field">
                <label htmlFor="responsavel" className="prop-field-label">
                  Representante legal *
                </label>
                <input
                  id="responsavel"
                  required
                  value={responsavelLegal}
                  onChange={(e) => setResponsavelLegal(e.target.value)}
                  placeholder="Nome do sócio / diretor"
                  className="prop-input"
                />
              </div>
            </div>

            <div className="prop-form-actions">
              <button
                type="submit"
                disabled={acceptMutation.isPending || isExtracting}
                className="prop-btn prop-btn-blue"
                style={{ width: "100%", justifyContent: "center" }}
              >
                {acceptMutation.isPending
                  ? "Confirmando aceite..."
                  : "Aceitar proposta e solicitar contrato"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <footer className="prop-footer">
        <div className="prop-footer-inner">
          <div className="prop-footer-copy prop-footer-brand">
            <AgencyLogo height={20} />
            <span>Limeira/SP</span>
          </div>
          <div className="prop-footer-copy">vnove.com.br</div>
        </div>
      </footer>
    </>
  );
}
