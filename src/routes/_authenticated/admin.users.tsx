import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "მომხმარებლები — ადმინი" }] }),
  component: AdminUsers,
});

type Row = { id: string; first_name: string | null; last_name: string | null; district: string | null; phone: string | null; created_at: string; roles: string[] };

function AdminUsers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200);
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const roleMap = new Map<string, string[]>();
      (roles ?? []).forEach((r) => {
        const list = roleMap.get(r.user_id) ?? [];
        list.push(r.role);
        roleMap.set(r.user_id, list);
      });
      setRows((profiles ?? []).map((p) => ({ ...p, roles: roleMap.get(p.id) ?? ["user"] })));
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-4">მომხმარებლები</h1>
      {loading ? (
        <p className="text-sm text-muted-foreground">იტვირთება…</p>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">სახელი</th>
                <th className="text-left p-3">უბანი</th>
                <th className="text-left p-3">ტელეფონი</th>
                <th className="text-left p-3">როლი</th>
                <th className="text-left p-3">რეგისტრაცია</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3">{[r.first_name, r.last_name].filter(Boolean).join(" ") || "—"}</td>
                  <td className="p-3">{r.district ?? "—"}</td>
                  <td className="p-3">{r.phone ?? "—"}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {r.roles.map((role) => (
                        <span key={role} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${role === "admin" ? "bg-destructive text-destructive-foreground" : role === "partner" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{role}</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("ka-GE")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
