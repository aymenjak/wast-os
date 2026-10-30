"use client";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { assignWorkOrderAction } from "@/app/actions/business";
import { cn } from "@/lib/utils";

type Opt = { id: string; name: string };

export function AssignForm({ workOrderId, teams, vehicles, date, compact, defaultTeamId, defaultVehicleId }: { workOrderId: string; teams: Opt[]; vehicles: Opt[]; date: string; compact?: boolean; defaultTeamId?: string | null; defaultVehicleId?: string | null }) {
  const { t } = useI18n();
  const sel = "h-8 rounded-md border border-ink-300 bg-white px-2 text-sm";
  return (
    <ActionForm action={assignWorkOrderAction} hidden={{ workOrderId }} className={cn("flex flex-wrap items-end gap-2", compact && "flex-nowrap")}>
      <label className="sr-only" htmlFor={`team-${workOrderId}`}>{t("workOrders.team")}</label>
      <select id={`team-${workOrderId}`} name="teamId" required defaultValue={defaultTeamId ?? ""} className={sel}>
        <option value="" disabled>{t("workOrders.selectTeam")}</option>
        {teams.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
      </select>
      <label className="sr-only" htmlFor={`veh-${workOrderId}`}>{t("workOrders.vehicle")}</label>
      <select id={`veh-${workOrderId}`} name="vehicleId" defaultValue={defaultVehicleId ?? ""} className={sel}>
        <option value="">{t("workOrders.noVehicle")}</option>
        {vehicles.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
      </select>
      <label className="sr-only" htmlFor={`date-${workOrderId}`}>{t("workOrders.scheduled")}</label>
      <input id={`date-${workOrderId}`} type="date" name="scheduledDate" defaultValue={date} className={sel} required />
      <SubmitButton size="sm">{t("workOrders.assign")}</SubmitButton>
    </ActionForm>
  );
}
