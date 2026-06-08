import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { jsonResponse, errorResponse } from "@/lib/api/auth";

export async function POST(_request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase.auth.signOut();
  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ success: true });
}
