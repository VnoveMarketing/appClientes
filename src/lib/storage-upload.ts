import { getAdminSupabase } from "@/lib/api/admin-db";

const BUCKET = "proposta-assets";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

export async function uploadPropostaAsset(file: File, storagePath: string): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Formato inválido. Use PNG, JPG ou WEBP.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Arquivo muito grande. Máximo 5 MB.");
  }

  const supabase = getAdminSupabase();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}
