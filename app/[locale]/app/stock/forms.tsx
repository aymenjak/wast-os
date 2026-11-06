"use client";
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import {
  adjustStockAction, createStockItemAction, createStockPurchaseAction, createStockSupplierAction, issueStockAction,
  markStockPurchasePaidAction, openingStockAction, updateStockItemAction, voidStockPurchaseAction,
} from "@/app/actions/business";

const CATEGORIES = ["SPARE_PART", "LUBRICANT", "TYRE", "CLEANING", "PPE", "CONSUMABLE", "OTHER"] as const;
const UNITS = ["UNIT", "LITRE", "KG", "PAIR", "BOX", "ROLL", "METRE"] as const;

type Option = { id: string; label: string };

export function NewItemForm() {
  const { t } = useI18n();
  return (
    <ActionForm action={createStockItemAction} className="grid gap-3 sm:grid-cols-2">
      <Field label={t("stock.code")} name="code">{(p) => <Input {...p} required maxLength={40} dir="ltr" autoCapitalize="characters" />}</Field>
      <Field label={t("common.name")} name="name">{(p) => <Input {...p} required maxLength={160} />}</Field>
      <Field label={t("stock.category")} name="category">{(p) => <Select {...p} defaultValue="SPARE_PART">{CATEGORIES.map((c) => <option key={c} value={c}>{t(`enums.StockCategory.${c}`)}</option>)}</Select>}</Field>
      <Field label={t("stock.unit")} name="unit">{(p) => <Select {...p} defaultValue="UNIT">{UNITS.map((u) => <option key={u} value={u}>{t(`enums.StockUnit.${u}`)}</option>)}</Select>}</Field>
      <div className="sm:col-span-2"><Field label={t("stock.reorderLevel")} name="reorderLevel" optional hint={t("stock.reorderHint")}>{(p) => <Input {...p} inputMode="decimal" dir="ltr" />}</Field></div>
      <div className="sm:col-span-2"><SubmitButton>{t("stock.addItem")}</SubmitButton></div>
    </ActionForm>
  );
}

export function ItemSettingsForm({ itemId, name, reorderLevel, notes, active }: { itemId: string; name: string; reorderLevel: string; notes: string; active: boolean }) {
  const { t } = useI18n();
  return (
    <ActionForm action={updateStockItemAction} hidden={{ itemId }} className="grid gap-3" successMessage={t("common.saved")}>
      <Field label={t("common.name")} name="name">{(p) => <Input {...p} required maxLength={160} defaultValue={name} />}</Field>
      <Field label={t("stock.reorderLevel")} name="reorderLevel" hint={t("stock.reorderHint")}>{(p) => <Input {...p} inputMode="decimal" dir="ltr" defaultValue={reorderLevel} />}</Field>
      <Field label={t("common.notes")} name="notes" optional>{(p) => <Textarea {...p} rows={2} maxLength={1000} defaultValue={notes} />}</Field>
      <Checkbox name="active" label={t("stock.active")} defaultChecked={active} />
      <div><SubmitButton variant="secondary">{t("common.save")}</SubmitButton></div>
    </ActionForm>
  );
}

export function IssueForm({ itemId, vehicles, today }: { itemId: string; vehicles: Option[]; today: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={issueStockAction} hidden={{ itemId }} className="grid gap-3 sm:grid-cols-2" resetOnSuccess successMessage={t("common.saved")}>
      <Field label={t("stock.quantity")} name="quantity">{(p) => <Input {...p} required inputMode="decimal" dir="ltr" />}</Field>
      <Field label={t("stock.vehicle")} name="vehicleId" optional>{(p) => <Select {...p} defaultValue=""><option value="">{t("stock.noVehicle")}</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}</Select>}</Field>
      <Field label={t("common.date")} name="occurredOn">{(p) => <Input {...p} type="date" defaultValue={today} max={today} />}</Field>
      <Field label={t("common.reason")} name="reason" optional>{(p) => <Input {...p} maxLength={300} />}</Field>
      <div className="sm:col-span-2"><SubmitButton>{t("stock.record")}</SubmitButton></div>
    </ActionForm>
  );
}

export function OpeningForm({ itemId, today }: { itemId: string; today: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={openingStockAction} hidden={{ itemId }} className="grid gap-3 sm:grid-cols-3" successMessage={t("common.saved")}>
      <Field label={t("stock.quantity")} name="quantity">{(p) => <Input {...p} required inputMode="decimal" dir="ltr" />}</Field>
      <Field label={t("stock.unitCost")} name="unitCost">{(p) => <Input {...p} required inputMode="decimal" dir="ltr" />}</Field>
      <Field label={t("common.date")} name="occurredOn">{(p) => <Input {...p} type="date" defaultValue={today} max={today} />}</Field>
      <div className="sm:col-span-3"><SubmitButton variant="secondary">{t("stock.record")}</SubmitButton></div>
    </ActionForm>
  );
}

export function AdjustForm({ itemId, today }: { itemId: string; today: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={adjustStockAction} hidden={{ itemId }} className="grid gap-3 sm:grid-cols-2" resetOnSuccess successMessage={t("common.saved")}>
      <Field label={t("stock.quantity")} name="quantity" hint={"\u2066−2 / +1\u2069"}>{(p) => <Input {...p} required inputMode="decimal" dir="ltr" />}</Field>
      <Field label={t("stock.unitCost")} name="unitCost" optional hint={t("stock.adjustCostHint")}>{(p) => <Input {...p} inputMode="decimal" dir="ltr" />}</Field>
      <Field label={t("common.reason")} name="reason">{(p) => <Input {...p} required maxLength={300} />}</Field>
      <Field label={t("common.date")} name="occurredOn">{(p) => <Input {...p} type="date" defaultValue={today} max={today} />}</Field>
      <div className="sm:col-span-2"><SubmitButton variant="secondary">{t("stock.record")}</SubmitButton></div>
    </ActionForm>
  );
}

export function SupplierForm() {
  const { t } = useI18n();
  return (
    <ActionForm action={createStockSupplierAction} className="grid gap-3 sm:grid-cols-2" resetOnSuccess successMessage={t("common.saved")}>
      <Field label={t("common.name")} name="name">{(p) => <Input {...p} required maxLength={160} />}</Field>
      <Field label={t("stock.taxId")} name="taxId" optional>{(p) => <Input {...p} maxLength={40} dir="ltr" />}</Field>
      <Field label={t("common.phone")} name="phone" optional>{(p) => <Input {...p} maxLength={30} dir="ltr" inputMode="tel" />}</Field>
      <Field label={t("common.email")} name="email" optional>{(p) => <Input {...p} type="email" maxLength={254} dir="ltr" />}</Field>
      <div className="sm:col-span-2"><Field label={t("common.address")} name="address" optional>{(p) => <Input {...p} maxLength={300} />}</Field></div>
      <div className="sm:col-span-2"><SubmitButton variant="secondary">{t("stock.addSupplier")}</SubmitButton></div>
    </ActionForm>
  );
}

export function PurchaseForm({ suppliers, items, today }: { suppliers: Option[]; items: Option[]; today: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={createStockPurchaseAction} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t("stock.supplier")} name="supplierId" hint={suppliers.length ? undefined : t("stock.noSuppliers")}>
          {(p) => <Select {...p} required defaultValue=""><option value="" disabled>—</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</Select>}
        </Field>
        <Field label={t("stock.supplierInvoiceRef")} name="supplierInvoiceRef" optional>{(p) => <Input {...p} maxLength={60} dir="ltr" />}</Field>
        <Field label={t("stock.receivedOn")} name="receivedOn">{(p) => <Input {...p} type="date" defaultValue={today} max={today} />}</Field>
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <fieldset key={i} className="grid gap-2 rounded-md border border-ink-200 p-3 sm:grid-cols-[2fr_1fr_1fr]">
            <legend className="px-1 text-xs text-ink-600">{t("stock.line")} {i + 1}{i > 0 ? ` (${t("common.optional")})` : ""}</legend>
            <Field label={t("stock.item")} name={`lines.${i}.itemId`}>
              {(p) => <Select {...p} required={i === 0} defaultValue=""><option value="">—</option>{items.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</Select>}
            </Field>
            <Field label={t("stock.quantity")} name={`lines.${i}.quantity`}>{(p) => <Input {...p} required={i === 0} inputMode="decimal" dir="ltr" />}</Field>
            <Field label={t("stock.unitCost")} name={`lines.${i}.unitCost`}>{(p) => <Input {...p} required={i === 0} inputMode="decimal" dir="ltr" />}</Field>
          </fieldset>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t("stock.vat")} name="vat" optional>{(p) => <Input {...p} inputMode="decimal" dir="ltr" />}</Field>
      </div>
      <Checkbox name="paid" label={t("stock.paidNow")} />
      <div><SubmitButton>{t("stock.recordPurchase")}</SubmitButton></div>
    </ActionForm>
  );
}

export function MarkPaidForm({ purchaseId }: { purchaseId: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={markStockPurchasePaidAction} hidden={{ purchaseId }} successMessage={t("common.saved")}>
      <SubmitButton>{t("stock.markPaid")}</SubmitButton>
    </ActionForm>
  );
}

export function VoidPurchaseForm({ purchaseId }: { purchaseId: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={voidStockPurchaseAction} hidden={{ purchaseId }} className="grid gap-3" successMessage={t("common.saved")}>
      <p className="text-sm text-ink-600">{t("stock.voidHint")}</p>
      <Field label={t("common.reason")} name="reason">{(p) => <Input {...p} required maxLength={300} />}</Field>
      <div><SubmitButton variant="danger">{t("stock.voidTitle")}</SubmitButton></div>
    </ActionForm>
  );
}
