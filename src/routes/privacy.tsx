import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { PRIVACY } from "@/lib/legal-content";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Cheaper" },
      { name: "description", content: "Cheaper.ge privacy policy." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { language } = useI18n();
  return <LegalPage doc={PRIVACY[language]} />;
}
