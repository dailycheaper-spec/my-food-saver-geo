import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { formatGel } from "@/lib/db";
import type { AdminUserRow } from "@/lib/admin-users.functions";

export type UserEditValues = {
  first_name: string;
  last_name: string;
  phone: string;
  district: string;
  account_status: "active" | "suspended" | "unverified";
  role: "user" | "partner" | "admin";
};

const fieldClass =
  "w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

export function UserEditSheet({
  user,
  open,
  onOpenChange,
  onSave,
}: {
  user: AdminUserRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: UserEditValues) => Promise<void>;
}) {
  const { t } = useI18n();
  const [values, setValues] = useState<UserEditValues | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return setValues(null);
    setValues({
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      phone: user.phone ?? "",
      district: user.district ?? "",
      account_status: (user.account_status as UserEditValues["account_status"]) ?? "active",
      role: (user.roles.includes("admin")
        ? "admin"
        : user.roles.includes("partner")
          ? "partner"
          : "user") as UserEditValues["role"],
    });
  }, [user]);

  if (!user || !values) return null;

  const set = <K extends keyof UserEditValues>(key: K, value: UserEditValues[K]) =>
    setValues((prev) => (prev ? { ...prev, [key]: value } : prev));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("admin.users.editTitle")}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="text-xs text-muted-foreground">{t("admin.users.firstName")}</span>
              <input className={fieldClass} value={values.first_name} onChange={(e) => set("first_name", e.target.value)} />
            </label>
            <label className="space-y-1 block">
              <span className="text-xs text-muted-foreground">{t("admin.users.lastName")}</span>
              <input className={fieldClass} value={values.last_name} onChange={(e) => set("last_name", e.target.value)} />
            </label>
          </div>

          <label className="space-y-1 block">
            <span className="text-xs text-muted-foreground">{t("admin.users.email")}</span>
            <input className={`${fieldClass} opacity-70`} value={user.email ?? "—"} readOnly />
          </label>

          <label className="space-y-1 block">
            <span className="text-xs text-muted-foreground">{t("admin.users.phone")}</span>
            <input className={fieldClass} value={values.phone} onChange={(e) => set("phone", e.target.value)} />
          </label>

          <label className="space-y-1 block">
            <span className="text-xs text-muted-foreground">{t("admin.users.district")}</span>
            <input className={fieldClass} value={values.district} onChange={(e) => set("district", e.target.value)} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="text-xs text-muted-foreground">{t("admin.users.role")}</span>
              <select className={fieldClass} value={values.role} onChange={(e) => set("role", e.target.value as UserEditValues["role"])}>
                <option value="user">{t("admin.users.roleUser")}</option>
                <option value="partner">{t("admin.users.rolePartner")}</option>
                <option value="admin">{t("admin.users.roleAdmin")}</option>
              </select>
            </label>
            <label className="space-y-1 block">
              <span className="text-xs text-muted-foreground">{t("admin.users.status")}</span>
              <select
                className={fieldClass}
                value={values.account_status}
                onChange={(e) => set("account_status", e.target.value as UserEditValues["account_status"])}
              >
                <option value="active">{t("admin.users.statusActive")}</option>
                <option value="suspended">{t("admin.users.statusSuspended")}</option>
                <option value="unverified">{t("admin.users.statusUnverified")}</option>
              </select>
            </label>
          </div>

          <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{t("admin.users.summary")}</p>
            <div className="flex justify-between text-sm">
              <span>{t("admin.users.colOrders")}</span>
              <span className="font-semibold">{user.order_count}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{t("admin.users.colSpent")}</span>
              <span className="font-semibold">{formatGel(user.total_spent)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{t("admin.users.colSaved")}</span>
              <span className="font-semibold text-success">{formatGel(user.money_saved)}</span>
            </div>
          </div>

          <Button
            className="w-full"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(values);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? t("admin.users.saving") : t("admin.users.save")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
