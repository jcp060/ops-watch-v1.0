export const MAX_AIRCRAFT_IMAGE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_AIRCRAFT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

export type AircraftImageStorage = "supabase" | "local";

export interface AircraftImageUploadResult {
  url: string;
  storage: AircraftImageStorage;
}

export function validateAircraftImageFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const typeOk =
    ALLOWED_AIRCRAFT_IMAGE_TYPES.has(file.type) ||
    ALLOWED_EXTENSIONS.has(ext);

  if (!typeOk) {
    return "Only JPG, JPEG, PNG, and WebP images are allowed.";
  }

  if (file.size > MAX_AIRCRAFT_IMAGE_BYTES) {
    return "Image must be 5 MB or smaller.";
  }

  return null;
}

export function sanitizeUploadFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read image file."));
    };
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

/** Upload to Supabase when configured; otherwise store as a data URL in the app database (local dev). */
export async function uploadAircraftImageToStorage(
  file: File,
  aircraftId: string
): Promise<AircraftImageUploadResult> {
  const validationError = validateAircraftImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("aircraftId", aircraftId);

  const response = await fetch("/api/aircraft/image", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as { url?: string; error?: string };

  if (response.status === 503) {
    const url = await readFileAsDataUrl(file);
    return { url, storage: "local" };
  }

  if (!response.ok) {
    throw new Error(payload.error ?? "Image upload failed. Please try again.");
  }

  if (!payload.url) {
    throw new Error("Upload succeeded but no image URL was returned.");
  }

  return { url: payload.url, storage: "supabase" };
}
