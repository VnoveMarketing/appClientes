import { NextRequest } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { jsonResponse, errorResponse } from "@/lib/api/auth";

const cartaoSocialSchema = z.object({
  empresa: z.string().nullable().describe("Razão social ou nome fantasia; null se não encontrado"),
  cnpj: z.string().nullable().describe("CNPJ formatado ou apenas números; null se não encontrado"),
  email: z.string().nullable().describe("E-mail corporativo; null se não encontrado"),
  telefone: z.string().nullable().describe("Telefone principal; null se não encontrado"),
  cidade: z.string().nullable().describe("Cidade da sede; null se não encontrado"),
  estado: z.string().nullable().describe("UF com 2 letras; null se não encontrado"),
  ramo_atividade: z.string().nullable().describe("Ramo ou atividade principal; null se não encontrado"),
  nome: z.string().nullable().describe("Nome do representante legal ou sócio; null se não encontrado"),
});

function sanitizeExtractedData(data: z.infer<typeof cartaoSocialSchema>) {
  return {
    empresa: data.empresa ?? undefined,
    cnpj: data.cnpj ?? undefined,
    email: data.email ?? undefined,
    telefone: data.telefone ?? undefined,
    cidade: data.cidade ?? undefined,
    estado: data.estado ?? undefined,
    ramo_atividade: data.ramo_atividade ?? undefined,
    nome: data.nome ?? undefined,
  };
}

const EXTRACTION_PROMPT =
  "Analise este cartão CNPJ, cartão social, contrato social ou documento cadastral de empresa brasileira. " +
  "Extraia todos os dados visíveis: razão social/nome fantasia, CNPJ, e-mail, telefone, cidade, estado (UF), " +
  "ramo de atividade e nome do representante legal. Use null para campos que não estiverem no documento.";

function buildDocumentContent(dataUrl: string) {
  if (dataUrl.startsWith("data:application/pdf")) {
    return {
      type: "file" as const,
      data: dataUrl,
      mediaType: "application/pdf" as const,
    };
  }

  if (dataUrl.startsWith("data:image/")) {
    return { type: "image" as const, image: dataUrl };
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return errorResponse("OPENAI_API_KEY não configurada no servidor", 500);
    }

    const body = await request.json();
    const { file, image } = body as { file?: string; image?: string };
    const dataUrl = file ?? image;

    if (!dataUrl) {
      return errorResponse("Arquivo inválido. Envie um PDF ou imagem.");
    }

    const documentContent = buildDocumentContent(dataUrl);
    if (!documentContent) {
      return errorResponse("Formato inválido. Envie PDF, JPG, PNG ou WEBP.");
    }

    const { object } = await generateObject({
      model: openai("gpt-4o"),
      schema: cartaoSocialSchema,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: EXTRACTION_PROMPT }, documentContent],
        },
      ],
    });

    return jsonResponse(sanitizeExtractedData(object));
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Erro ao extrair dados", 500);
  }
}
