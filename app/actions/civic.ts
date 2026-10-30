"use server";
import type { ActionState } from "@/lib/actions/state";
import { orgAction } from "@/server/action";
import { reviewCivicReport } from "@/server/services/civic";

export async function reviewReportAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => void (await reviewCivicReport(ctx, String(input.reportId ?? ""), input)), {
    revalidate: [`/app/civic/reports/${String(fd.get("reportId") ?? "")}`, "/app/civic/queue", "/app/civic"],
  });
}
