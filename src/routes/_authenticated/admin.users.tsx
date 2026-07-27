import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { useAllCustomers } from "@/lib/admin-db";
import { formatGel } from "@/lib/db";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin" }] }),
  component: AdminUsers,
});

function AdminUsers() {
  const { language } = useI18n();
  const L = (ka: string, en: string, ru: string) => (language === "en" ? en : language === "ru" ? ru : ka);
  const { rows, loading } = useAllCustomers();
  const [q, setQ] = useState("");

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (r.first_name ?? "").toLowerCase().includes(s)
      || (r.last_name ?? "").toLowerCase().includes(s)
      || (r.phone ?? "").includes(s)
      || (r.district ?? "").toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">{L("მომხმარებლები", "Users", "Пользователи")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{rows.length} {L("რეგისტრირებული", "registered", "зарегистрировано")}</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L("ძებნა სახელით, ტელეფონით, უბნით…", "Search by name, phone, district…", "Поиск по имени, телефону, району…")}
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{L("იტვირთება…", "Loading…", "Загрузка…")}</p>
      ) : (
        <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-3 font-semibold">{L("სახელი", "Name", "Имя")}</th>
                  <th className="text-left p-3 font-semibold">{L("უბანი", "District", "Район")}</th>
                  <th className="text-left p-3 font-semibold">{L("ტელეფონი", "Phone", "Телефон")}</th>
                  <th className="text-right p-3 font-semibold">{L("შეკვეთა", "Orders", "Заказы")}</th>
                  <th className="text-right p-3 font-semibold">{L("დახარჯული", "Spent", "Потрачено")}</th>
                  <th className="text-right p-3 font-semibold">{L("დაზოგილი", "Saved", "Сэкономлено")}</th>
                  <th className="text-left p-3 font-semibold">{L("როლი", "Role", "Роль")}</th>
                  <th className="text-left p-3 font-semibold">{L("რეგისტრაცია", "Joined", "Регистрация")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 font-medium">{[r.first_name, r.last_name].filter(Boolean).join(" ") || "—"}</td>
                    <td className="p-3">{r.district ?? "—"}</td>
                    <td className="p-3">{r.phone ?? "—"}</td>
                    <td className="p-3 text-right">{r.order_count}</td>
                    <td className="p-3 text-right">{formatGel(r.total_spent)}</td>
                    <td className="p-3 text-right text-success font-semibold">{formatGel(r.money_saved)}</td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        {r.roles.map((role) => (
                          <span key={role} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${role === "admin" ? "bg-destructive text-destructive-foreground" : role === "partner" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{role}</span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleDateString("ka-GE")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">{L("არაფერი მოიძებნა.", "Nothing found.", "Ничего не найдено.")}</p>}
        </div>
      )}
    </div>
  );
}
