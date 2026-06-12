import { NextResponse } from "next/server";
import {
  findProfileByUsername,
  signInWithEmailPassword,
} from "@/lib/supabase/profiles-db";
import {
  createSupabaseAdmin,
  createSupabaseAuthClient,
  isSupabaseStorageConfigured,
} from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!isSupabaseStorageConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  let body: { username?: string; password?: string };
  try {
    body = (await request.json()) as { username?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required." },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Supabase admin client is not configured." },
      { status: 503 }
    );
  }

  const { profile, error: profileError } = await findProfileByUsername(
    admin,
    username
  );

  if (profileError || !profile) {
    console.error("[OPS Watch] login profile lookup failed", {
      username,
      error: profileError,
    });
    return NextResponse.json(
      { error: profileError ?? "Invalid username or password." },
      { status: 401 }
    );
  }

  console.log("[OPS Watch] login username → email:", username, "→", profile.email);

  const authClient = createSupabaseAuthClient();
  if (!authClient) {
    return NextResponse.json(
      { error: "Supabase auth client is not configured." },
      { status: 503 }
    );
  }

  const { userId, error: signInError, code } = await signInWithEmailPassword(
    authClient,
    profile.email,
    password
  );

  if (signInError || !userId) {
    return NextResponse.json(
      {
        error: signInError ?? "Invalid username or password.",
        code,
      },
      { status: 401 }
    );
  }

  if (userId !== profile.id) {
    console.error("[OPS Watch] auth user id does not match profile id", {
      authUserId: userId,
      profileId: profile.id,
    });
    return NextResponse.json(
      { error: "Account profile mismatch. Contact an administrator." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    session: {
      userId: profile.id,
      username: profile.username,
      role: profile.role,
      email: profile.email,
      loggedInAt: new Date().toISOString(),
    },
  });
}
