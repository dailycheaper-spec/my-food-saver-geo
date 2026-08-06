import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Download,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { UserEditSheet, type UserEditValues } from "@/components/admin/UserEditSheet";
import {
  deleteUserAccount,
  generateTempPassword,
  listAdminUsers,
  sendPasswordReset,
  setUserRole,
  setUserStatus,
  updateAdminUser,
  type AdminUserRow,
} from "@/lib/admin-users.functions";
import { formatGel } from "@/lib/db";
import { useI18n, formatDate } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin" }] }),
  component: AdminUsers,
});

type SortKey = "created_at" | "total_spent" | "order_count";
type Pending =
  | { kind: "delete"; user: AdminUserRow }
  | { kind: "suspend"; user: AdminUserRow }
  | { kind: "bulkSuspend"; ids: string[] };

const controlClass =
  "px-3 py-2.5 rounded-2xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

function statusClass(status: string) {
  if (status === "suspended") return "bg-destructive text-destructive-foreground";
  if (status === "unverified") return "bg-warning text-warning-foreground";
  return "bg-success text-success-foreground";
}

function fullName(u: AdminUserRow) {
  return [u.first_name, u.last_name].filter(Boolean).join(" ") || "—";
}

function AdminUsers() {
  const { t, language } = useI18n();
  const load = useServerFn(listAdminUsers);
  const saveUser = useServerFn(updateAdminUser);
  const changeRole = useServerFn(setUserRole);
  const changeStatus = useServerFn(setUserStatus);
  const resetPassword = useServerFn(sendPasswordReset);
  const tempPassword = useServerFn(generateTempPassword);
  const removeUser = useServerFn(deleteUserAccount);

  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRows((await load()) as AdminUserRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const districts = useMemo(
    () => Array.from(new Set(rows.map((r) => r.district).filter(Boolean) as string[])).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (s) {
        const hay = `${r.first_name ?? ""} ${r.last_name ?? ""} ${r.phone ?? ""} ${r.district ?? ""} ${r.email ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      if (roleFilter !== "all") {
        if (roleFilter === "user" ? r.roles.some((x) => x === "admin" || x === "partner") : !r.roles.includes(roleFilter)) return false;
      }
      if (statusFilter !== "all") {
        const status = !r.email_confirmed && r.account_status === "active" ? "unverified" : r.account_status;
        if (status !== statusFilter) return false;
      }
      if (districtFilter !== "all" && r.district !== districtFilter) return false;
      return true;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = sortKey === "created_at" ? new Date(a.created_at).getTime() : Number(a[sortKey]);
      const bv = sortKey === "created_at" ? new Date(b.created_at).getTime() : Number(b[sortKey]);
      return (av - bv) * dir;
    });
  }, [rows, q, roleFilter, statusFilter, districtFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  useEffect(() => {
    setPage(1);
  }, [q, roleFilter, statusFilter, districtFilter, perPage]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const exportCsv = (list: AdminUserRow[]) => {
    const header = ["Name", "Email", "Phone", "District", "Status", "Roles", "Orders", "Spent", "Saved", "Joined"];
    const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = list.map((r) =>
      [
        fullName(r),
        r.email ?? "",
        r.phone ?? "",
        r.district ?? "",
        r.account_status,
        r.roles.join("|"),
        r.order_count,
        r.total_spent.toFixed(2),
        r.money_saved.toFixed(2),
        new Date(r.created_at).toISOString(),
      ]
        .map(escape)
        .join(","),
    );
    const blob = new Blob([[header.map(escape).join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cheaper-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const run = async (fn: () => Promise<unknown>, successMessage: string) => {
    try {
      await fn();
      toast.success(successMessage);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const handleSave = async (user: AdminUserRow, values: UserEditValues) => {
    try {
      await saveUser({
        data: {
          id: user.id,
          first_name: values.first_name || null,
          last_name: values.last_name || null,
          phone: values.phone || null,
          district: values.district || null,
          account_status: values.account_status,
        },
      });
      const currentRole = user.roles.includes("admin") ? "admin" : user.roles.includes("partner") ? "partner" : "user";
      if (currentRole !== values.role) await changeRole({ data: { userId: user.id, role: values.role } });
      toast.success(t("admin.users.savedToast"));
      setEditing(null);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const allOnPageSelected = paged.length > 0 && paged.every((r) => selected.includes(r.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">{t("admin.users.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {rows.length} {t("admin.users.registered")}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("admin.users.searchPlaceholder")}
            className={`${controlClass} w-full pl-10`}
          />
        </div>
        <select className={controlClass} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label={t("admin.users.filterRole")}>
          <option value="all">{t("admin.users.allRoles")}</option>
          <option value="user">{t("admin.users.roleUser")}</option>
          <option value="partner">{t("admin.users.rolePartner")}</option>
          <option value="admin">{t("admin.users.roleAdmin")}</option>
        </select>
        <select className={controlClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label={t("admin.users.filterStatus")}>
          <option value="all">{t("admin.users.allStatuses")}</option>
          <option value="active">{t("admin.users.statusActive")}</option>
          <option value="suspended">{t("admin.users.statusSuspended")}</option>
          <option value="unverified">{t("admin.users.statusUnverified")}</option>
        </select>
        <select className={controlClass} value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)} aria-label={t("admin.users.filterDistrict")}>
          <option value="all">{t("admin.users.allDistricts")}</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <Button variant="outline" className="rounded-2xl gap-2" onClick={() => exportCsv(filtered)}>
          <Download className="w-4 h-4" />
          {t("admin.users.exportCsv")}
        </Button>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
          <span className="text-sm font-medium">{t("admin.users.bulkSelected", { count: selected.length })}</span>
          <div className="flex-1" />
          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setPending({ kind: "bulkSuspend", ids: selected })}>
            {t("admin.users.bulkSuspend")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl"
            onClick={() =>
              run(async () => {
                await changeStatus({ data: { ids: selected, status: "active" } });
                setSelected([]);
              }, t("admin.users.statusChanged"))
            }
          >
            {t("admin.users.bulkActivate")}
          </Button>
          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => exportCsv(filtered.filter((r) => selected.includes(r.id)))}>
            {t("admin.users.bulkExport")}
          </Button>
          <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setSelected([])}>
            {t("admin.users.bulkClear")}
          </Button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3 w-10">
                    <Checkbox
                      aria-label={t("admin.users.selectAll")}
                      checked={allOnPageSelected}
                      onCheckedChange={(checked) =>
                        setSelected((prev) =>
                          checked
                            ? Array.from(new Set([...prev, ...paged.map((r) => r.id)]))
                            : prev.filter((id) => !paged.some((r) => r.id === id)),
                        )
                      }
                    />
                  </th>
                  <th className="text-left p-3 font-semibold">{t("admin.users.colName")}</th>
                  <th className="text-left p-3 font-semibold">{t("admin.users.colEmail")}</th>
                  <th className="text-left p-3 font-semibold">{t("admin.users.colDistrict")}</th>
                  <th className="text-left p-3 font-semibold">{t("admin.users.colPhone")}</th>
                  <SortHeader label={t("admin.users.colOrders")} active={sortKey === "order_count"} dir={sortDir} onClick={() => toggleSort("order_count")} />
                  <SortHeader label={t("admin.users.colSpent")} active={sortKey === "total_spent"} dir={sortDir} onClick={() => toggleSort("total_spent")} />
                  <th className="text-right p-3 font-semibold">{t("admin.users.colSaved")}</th>
                  <th className="text-left p-3 font-semibold">{t("admin.users.colStatus")}</th>
                  <th className="text-left p-3 font-semibold">{t("admin.users.colRole")}</th>
                  <SortHeader label={t("admin.users.colJoined")} active={sortKey === "created_at"} dir={sortDir} onClick={() => toggleSort("created_at")} />
                  <th className="text-right p-3 font-semibold">{t("admin.users.colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => {
                  const status = !r.email_confirmed && r.account_status === "active" ? "unverified" : r.account_status;
                  return (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          aria-label={fullName(r)}
                          checked={selected.includes(r.id)}
                          onCheckedChange={(checked) =>
                            setSelected((prev) => (checked ? [...prev, r.id] : prev.filter((id) => id !== r.id)))
                          }
                        />
                      </td>
                      <td className="p-3 font-medium cursor-pointer" onClick={() => setEditing(r)}>
                        {fullName(r)}
                      </td>
                      <td className="p-3 text-muted-foreground">{r.email ?? "—"}</td>
                      <td className="p-3">{r.district ?? "—"}</td>
                      <td className="p-3">{r.phone ?? "—"}</td>
                      <td className="p-3 text-right">{r.order_count}</td>
                      <td className="p-3 text-right">{formatGel(r.total_spent)}</td>
                      <td className="p-3 text-right text-success font-semibold">{formatGel(r.money_saved)}</td>
                      <td className="p-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${statusClass(status)}`}>
                          {t(`admin.users.status${status.charAt(0).toUpperCase()}${status.slice(1)}`)}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1 flex-wrap">
                          {r.roles.map((role) => (
                            <span
                              key={role}
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${role === "admin" ? "bg-destructive text-destructive-foreground" : role === "partner" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(r.created_at, language, { day: "2-digit", month: "2-digit", year: "numeric" })}
                      </td>
                      <td className="p-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-xl" aria-label={t("admin.users.colActions")}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={() => setEditing(r)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              {t("admin.users.actionEdit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                run(async () => {
                                  const res = (await resetPassword({
                                    data: { userId: r.id, redirectTo: `${window.location.origin}/auth` },
                                  })) as { email: string };
                                  toast.success(t("admin.users.resetSent", { email: res.email }));
                                }, t("admin.users.resetSent", { email: r.email ?? "" }))
                              }
                            >
                              <KeyRound className="w-4 h-4 mr-2" />
                              {t("admin.users.actionReset")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  const res = (await tempPassword({ data: { userId: r.id } })) as { password: string };
                                  await navigator.clipboard?.writeText(res.password).catch(() => undefined);
                                  toast.success(`${t("admin.users.tempPasswordTitle")}: ${res.password}`, { duration: 15000 });
                                } catch (e) {
                                  toast.error(e instanceof Error ? e.message : String(e));
                                }
                              }}
                            >
                              <Shield className="w-4 h-4 mr-2" />
                              {t("admin.users.actionTemp")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {(["user", "partner", "admin"] as const).map((role) => (
                              <DropdownMenuItem
                                key={role}
                                disabled={r.roles.includes(role)}
                                onClick={() => run(() => changeRole({ data: { userId: r.id, role } }), t("admin.users.roleChanged"))}
                              >
                                <Shield className="w-4 h-4 mr-2 opacity-50" />
                                {t(`admin.users.role${role === "user" ? "User" : role === "partner" ? "Partner" : "Admin"}`)}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            {r.account_status === "suspended" ? (
                              <DropdownMenuItem
                                onClick={() => run(() => changeStatus({ data: { ids: [r.id], status: "active" } }), t("admin.users.statusChanged"))}
                              >
                                <UserCheck className="w-4 h-4 mr-2" />
                                {t("admin.users.actionActivate")}
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => setPending({ kind: "suspend", user: r })}>
                                <UserX className="w-4 h-4 mr-2" />
                                {t("admin.users.actionSuspend")}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setPending({ kind: "delete", user: r })}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              {t("admin.users.actionDelete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">{t("admin.users.nothingFound")}</p>}

          {filtered.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 justify-between p-3 border-t border-border">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                {t("admin.users.perPage")}
                <select
                  className="px-2 py-1 rounded-lg bg-background border border-border text-sm"
                  value={perPage}
                  onChange={(e) => setPerPage(Number(e.target.value))}
                >
                  {[10, 25, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {t("admin.users.pageOf", { page: currentPage, total: totalPages })}
                </span>
                <Button size="sm" variant="outline" className="rounded-xl" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                  {t("admin.users.prev")}
                </Button>
                <Button size="sm" variant="outline" className="rounded-xl" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
                  {t("admin.users.next")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <UserEditSheet
        user={editing}
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        onSave={(values) => handleSave(editing as AdminUserRow, values)}
      />

      <AlertDialog open={Boolean(pending)} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.kind === "delete" ? t("admin.users.confirmDeleteTitle") : t("admin.users.confirmSuspendTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.kind === "delete" ? t("admin.users.confirmDeleteDesc") : t("admin.users.confirmSuspendDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.users.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const action = pending;
                setPending(null);
                if (!action) return;
                if (action.kind === "delete") {
                  await run(() => removeUser({ data: { userId: action.user.id } }), t("admin.users.deletedToast"));
                } else if (action.kind === "suspend") {
                  await run(() => changeStatus({ data: { ids: [action.user.id], status: "suspended" } }), t("admin.users.statusChanged"));
                } else {
                  await run(async () => {
                    await changeStatus({ data: { ids: action.ids, status: "suspended" } });
                    setSelected([]);
                  }, t("admin.users.statusChanged"));
                }
              }}
            >
              {t("admin.users.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SortHeader({ label, active, dir, onClick }: { label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void }) {
  return (
    <th className="text-right p-3 font-semibold">
      <button type="button" onClick={onClick} className="inline-flex items-center gap-1 uppercase hover:text-foreground">
        {label}
        {active && (dir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
      </button>
    </th>
  );
}
