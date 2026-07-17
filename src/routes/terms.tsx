import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { TERMS } from "@/lib/legal-content";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Cheaper" },
      { name: "description", content: "Cheaper.ge terms and conditions." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const { language } = useI18n();
  return <LegalPage doc={TERMS[language]} />;
}
