import { NextRequest } from "next/server";
import { requireContratosAccess, jsonResponse, errorResponse } from "@/lib/api/auth";
import { normalizeContractText } from "@/lib/contract-builder";

function extractTextFromDocxBuffer(buffer: Buffer): Promise<string> {
  return import("mammoth").then(({ extractRawText }) =>
    extractRawText({ buffer }).then((result) => result.value)
  );
}

async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const pdfParse = await import("pdf-parse");
  const parser = "default" in pdfParse && typeof pdfParse.default === "function"
    ? pdfParse.default
    : (pdfParse as unknown as (buf: Buffer) => Promise<{ text?: string }>);
  const data = await parser(buffer);
  return data.text ?? "";
}

export async function POST(request: NextRequest) {
  const auth = await requireContratosAccess();
  if ("error" in auth) return auth.error;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) return errorResponse("Arquivo não enviado");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mime = file.type;
    const name = file.name.toLowerCase();

    let text = "";

    if (
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      name.endsWith(".docx")
    ) {
      text = await extractTextFromDocxBuffer(buffer);
    } else if (mime === "application/pdf" || name.endsWith(".pdf")) {
      text = await extractTextFromPdfBuffer(buffer);
    } else if (mime === "text/plain" || name.endsWith(".txt")) {
      text = buffer.toString("utf-8");
    } else {
      return errorResponse("Formato não suportado. Envie PDF, DOCX ou TXT.");
    }

    return jsonResponse({
      conteudo_template: normalizeContractText(text.trim()),
      arquivo_nome: file.name,
      mime_type: mime || null,
    });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Erro ao processar arquivo", 500);
  }
}
