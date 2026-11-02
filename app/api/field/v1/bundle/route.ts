import { withFieldSession } from "@/server/http/field-guard";
import { fieldBundle } from "@/server/services/field";

export const dynamic = "force-dynamic";

/** The driver's jobs for yesterday–tomorrow and the active destinations, cached on the phone for offline work. */
export async function GET(req: Request) {
  return withFieldSession(req, (ctx) => fieldBundle(ctx));
}
