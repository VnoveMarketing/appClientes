import { NextRequest } from "next/server";
import { requireContratosAccess, jsonResponse, errorResponse } from "@/lib/api/auth";
import { uploadPropostaAsset } from "@/lib/storage-upload";

export async function POST(request: NextRequest) {
  const auth = await requireContratosAccess();
  if ("error" in auth) return auth.error;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return errorResponse("Arquivo não enviado");
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `cases/${crypto.randomUUID()}.${ext}`;
    const url = await uploadPropostaAsset(file, path);

    return jsonResponse({ url });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Erro no upload", 500);
  }
}
