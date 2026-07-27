import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import type { LegalDoc } from "@/lib/legal-content";

export function LegalPage({ doc }: { doc: LegalDoc }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="page-shell">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> {doc.back}
      </Link>

      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold">{doc.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{doc.subtitle}</p>
      </header>

      <div className="space-y-2">
        {doc.sections.map((s, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                aria-expanded={isOpen}
              >
                <span className="text-sm font-semibold">{s.title}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-1 text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {s.body}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-8">
        © {new Date().getFullYear()} Cheaper.ge
      </p>
    </div>
  );
}
