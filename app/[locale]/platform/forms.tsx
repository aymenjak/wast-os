"use client";
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { changeSubscriptionAction, reactivateTenantAction, setStaffRoleAction, setVerificationAction, suspendTenantAction, updatePlanAction } from "@/app/actions/platform";

export function VerificationForm({ organizationId, status }: { organizationId: string; status: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={setVerificationAction} hidden={{ organizationId }} className="flex items-end gap-2" successMessage={t("common.saved")}>
      <Field label={t("platform.tenant.verification")} name="status" className="flex-1">
        {(p) => <Select {...p} defaultValue={status}>{(["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"] as const).map((v) => <option key={v} value={v}>{t(`enums.VerificationStatus.${v}`)}</option>)}</Select>}
      </Field>
      <SubmitButton variant="secondary">{t("platform.tenant.save")}</SubmitButton>
    </ActionForm>
  );
}

export function SubscriptionForm({ organizationId, plans, current }: { organizationId: string; plans: { code: string; name: string }[]; current: { planCode: string; status: string; end: string; cycle: string } | null }) {
  const { t } = useI18n();
  return (
    <ActionForm action={changeSubscriptionAction} hidden={{ organizationId }} className="grid gap-3 sm:grid-cols-4" successMessage={t("common.saved")}>
      <Field label={t("platform.tenants.plan")} name="planCode">
        {(p) => <Select {...p} defaultValue={current?.planCode ?? plans[0]?.code}>{plans.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}</Select>}
      </Field>
      <Field label={t("common.status")} name="status">
        {(p) => <Select {...p} defaultValue={current?.status ?? "TRIAL"}>{(["TRIAL", "ACTIVE", "PAST_DUE", "CANCELLED"] as const).map((v) => <option key={v} value={v}>{t(`enums.SubscriptionStatus.${v}`)}</option>)}</Select>}
      </Field>
      <Field label={t("billing.cycle")} name="billingCycle">
        {(p) => <Select {...p} defaultValue={current?.cycle ?? "MONTHLY"}>{(["MONTHLY", "YEARLY"] as const).map((v) => <option key={v} value={v}>{t(`billing.cycles.${v}`)}</option>)}</Select>}
      </Field>
      <Field label={t("platform.tenant.periodEnd")} name="currentPeriodEnd">{(p) => <Input {...p} type="date" required defaultValue={current?.end} />}</Field>
      <div className="sm:col-span-4"><SubmitButton>{t("platform.tenant.save")}</SubmitButton></div>
    </ActionForm>
  );
}

export function SuspendForm({ organizationId }: { organizationId: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={suspendTenantAction} hidden={{ organizationId }} className="space-y-3">
      <p className="text-sm text-ink-700">{t("platform.tenant.suspendHint")}</p>
      <Field label={t("platform.tenant.suspendReason")} name="reason">{(p) => <Input {...p} required maxLength={300} />}</Field>
      <SubmitButton variant="danger">{t("platform.tenant.suspend")}</SubmitButton>
    </ActionForm>
  );
}

export function ReactivateForm({ organizationId }: { organizationId: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={reactivateTenantAction} hidden={{ organizationId }}>
      <SubmitButton>{t("platform.tenant.reactivate")}</SubmitButton>
    </ActionForm>
  );
}

type Plan = { code: string; name: string; priceMonthly: string; priceYearly: string; maxUsers: number; maxVehicles: number; maxCustomers: number; customerPortal: boolean; advancedReports: boolean; isPublic: boolean };

export function PlanForm({ plan }: { plan: Plan }) {
  const { t } = useI18n();
  return (
    <ActionForm action={updatePlanAction} hidden={{ code: plan.code }} className="grid gap-3 sm:grid-cols-3" successMessage={t("common.saved")}>
      <Field label={t("platform.plans.name")} name="name">{(p) => <Input {...p} required defaultValue={plan.name} />}</Field>
      <Field label={t("platform.plans.priceMonthly")} name="priceMonthly">{(p) => <Input {...p} inputMode="decimal" required defaultValue={plan.priceMonthly} />}</Field>
      <Field label={t("platform.plans.priceYearly")} name="priceYearly">{(p) => <Input {...p} inputMode="decimal" required defaultValue={plan.priceYearly} />}</Field>
      <Field label={t("platform.plans.maxUsers")} name="maxUsers" hint={t("platform.plans.unlimited")}>{(p) => <Input {...p} type="number" min={-1} required defaultValue={plan.maxUsers} />}</Field>
      <Field label={t("platform.plans.maxVehicles")} name="maxVehicles">{(p) => <Input {...p} type="number" min={-1} required defaultValue={plan.maxVehicles} />}</Field>
      <Field label={t("platform.plans.maxCustomers")} name="maxCustomers">{(p) => <Input {...p} type="number" min={-1} required defaultValue={plan.maxCustomers} />}</Field>
      <div className="flex flex-wrap gap-4 sm:col-span-3">
        <Checkbox name="customerPortal" defaultChecked={plan.customerPortal} label={t("platform.plans.customerPortal")} />
        <Checkbox name="advancedReports" defaultChecked={plan.advancedReports} label={t("platform.plans.advancedReports")} />
        <Checkbox name="isPublic" defaultChecked={plan.isPublic} label={t("platform.plans.isPublic")} />
      </div>
      <div className="sm:col-span-3"><SubmitButton>{t("platform.plans.save")}</SubmitButton></div>
    </ActionForm>
  );
}

export function StaffRoleForm({ email, role }: { email?: string; role?: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={setStaffRoleAction} className="flex flex-wrap items-end gap-2" resetOnSuccess={!email} successMessage={t("common.saved")}>
      {email ? <input type="hidden" name="email" value={email} /> : <Field label={t("platform.staff.email")} name="email" hint={t("platform.staff.assignHint")} className="min-w-64 flex-1">{(p) => <Input {...p} type="email" required />}</Field>}
      <Field label={t("platform.staff.role")} name="role">
        {(p) => <Select {...p} defaultValue={role ?? "SUPPORT"}>{(["OWNER", "ADMIN", "SUPPORT", "NONE"] as const).map((v) => <option key={v} value={v}>{t(`platform.roles.${v}`)}</option>)}</Select>}
      </Field>
      <SubmitButton variant="secondary">{t("platform.staff.assign")}</SubmitButton>
    </ActionForm>
  );
}
