import { NextResponse } from "next/server";
import type { Aircraft, Organization } from "@/lib/types";
import { aircraftToRow, listSupabaseAircraft, rowToAircraft } from "@/lib/supabase/aircraft-db";
import {
  listOrganizationsInSupabase,
  resolveOrganizationUuidByLocalId,
} from "@/lib/supabase/organizations-db";
import { createSupabaseAdmin } from "@/lib/supabase/server";

type CreateAircraftBody = Omit<Aircraft, "id"> & {
  organization?: Organization;
};

export async function GET() {
  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  const { organizations, error: orgError } =
    await listOrganizationsInSupabase(supabase);
  if (orgError) {
    return NextResponse.json({ error: orgError }, { status: 500 });
  }

  const { aircraft, error } = await listSupabaseAircraft(supabase, organizations);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  console.log("[OPS Watch][API] GET /api/aircraft", {
    count: aircraft.length,
  });

  return NextResponse.json({ aircraft });
}

export async function POST(request: Request) {
  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  let body: CreateAircraftBody;
  try {
    body = (await request.json()) as CreateAircraftBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.tailNumber?.trim() || !body.organizationId?.trim()) {
    return NextResponse.json(
      { error: "Tail number and organization are required." },
      { status: 400 }
    );
  }

  if (!body.organization?.localId?.trim()) {
    return NextResponse.json(
      {
        error:
          "Organization localId is required for Supabase sync. Refresh the page and try again.",
      },
      { status: 400 }
    );
  }

  const organizationLocalId = body.organization.localId.trim();

  const { uuid: organizationUuid, error: orgError } =
    await resolveOrganizationUuidByLocalId(supabase, organizationLocalId);

  if (orgError || !organizationUuid) {
    return NextResponse.json(
      {
        error:
          orgError ??
          "Organization not found in Supabase. Create it in Settings first.",
      },
      { status: 404 }
    );
  }

  console.log(
    "[Supabase] aircraft insert organization local_id → uuid:",
    organizationLocalId,
    "→",
    organizationUuid
  );

  const { organizationId: _orgUuid, ...aircraftFields } = body;
  const row = aircraftToRow(
    {
      ...aircraftFields,
      tailNumber: body.tailNumber.trim().toUpperCase(),
    },
    organizationUuid
  );

  const { data, error } = await supabase
    .from("aircraft")
    .insert([row])
    .select()
    .single();

  if (error) {
    console.error("Supabase aircraft insert failed", error);
    return NextResponse.json(
      { error: error.message || "Failed to save aircraft." },
      { status: 500 }
    );
  }

  const aircraft = rowToAircraft(data, {
    organizationId: organizationUuid,
    stateAbbr: body.stateAbbr,
    stateName: body.stateName,
  });

  return NextResponse.json({ aircraft });
}
