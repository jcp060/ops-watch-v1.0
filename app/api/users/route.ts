import { NextResponse } from "next/server";
import type { CreateProfileInput } from "@/lib/types";
import {
  createAuthUser,
  deleteAuthUser,
  listProfiles,
  upsertProfileForAuthUser,
  validateCreateProfileInput,
} from "@/lib/supabase/profiles-db";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  const { profiles, error } = await listProfiles(supabase);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ profiles });
}

export async function POST(request: Request) {
  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  let body: CreateProfileInput;
  try {
    body = (await request.json()) as CreateProfileInput;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const validationError = validateCreateProfileInput(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const { userId, error: authError } = await createAuthUser(
    supabase,
    body.email,
    body.password
  );

  if (authError || !userId) {
    return NextResponse.json(
      { error: authError ?? "Could not create auth user." },
      { status: 500 }
    );
  }

  const { profile, error: profileError } = await upsertProfileForAuthUser(
    supabase,
    userId,
    body
  );

  if (profileError || !profile) {
    await deleteAuthUser(supabase, userId);
    return NextResponse.json(
      { error: profileError ?? "Could not save profile." },
      { status: 500 }
    );
  }

  return NextResponse.json({ profile });
}
