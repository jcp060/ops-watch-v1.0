import { NextResponse } from "next/server";
import {
  sanitizeUploadFileName,
  validateAircraftImageFile,
} from "@/lib/aircraft-image";
import {
  getAircraftImagesBucket,
  createSupabaseAdmin,
} from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Image storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }

  const file = formData.get("file");
  const aircraftId = formData.get("aircraftId");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image file provided." }, { status: 400 });
  }

  if (typeof aircraftId !== "string" || !aircraftId.trim()) {
    return NextResponse.json(
      { error: "Aircraft identifier is required." },
      { status: 400 }
    );
  }

  const validationError = validateAircraftImageFile(file);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const safeId = aircraftId.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeName = sanitizeUploadFileName(file.name);
  const path = `aircraft/${safeId}/${Date.now()}-${safeName}`;

  const bucket = getAircraftImagesBucket();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });

  if (uploadError) {
    console.error("Supabase aircraft image upload failed", uploadError);
    return NextResponse.json(
      {
        error:
          uploadError.message ||
          `Upload failed. Check that the "${bucket}" storage bucket exists and is public.`,
      },
      { status: 500 }
    );
  }

  const { data: publicData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return NextResponse.json({ url: publicData.publicUrl, path });
}
