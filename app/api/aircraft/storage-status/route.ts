import { NextResponse } from "next/server";
import { isSupabaseStorageConfigured } from "@/lib/supabase/server";

export async function GET() {
  return NextResponse.json({
    configured: isSupabaseStorageConfigured(),
  });
}
