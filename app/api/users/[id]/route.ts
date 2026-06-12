import { NextResponse } from "next/server";
import type { UpdateProfileInput } from "@/lib/types";
import {
  deleteAuthUser,
  deleteProfileRecord,
  updateProfile,
} from "@/lib/supabase/profiles-db";
import { createSupabaseAdmin } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "User id is required." }, { status: 400 });
  }

  let body: UpdateProfileInput;
  try {
    body = (await request.json()) as UpdateProfileInput;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { profile, error } = await updateProfile(supabase, id.trim(), body);
  if (error || !profile) {
    return NextResponse.json(
      { error: error ?? "Could not update user." },
      { status: 500 }
    );
  }

  return NextResponse.json({ profile });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "User id is required." }, { status: 400 });
  }

  const userId = id.trim();

  const { error: profileError } = await deleteProfileRecord(supabase, userId);
  if (profileError) {
    return NextResponse.json({ error: profileError }, { status: 500 });
  }

  const { error: authError } = await deleteAuthUser(supabase, userId);
  if (authError) {
    return NextResponse.json({ error: authError }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
