import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { ABOUT } from "@/lib/legal-content";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Cheaper" },
      { name: "description", content: "About Cheaper.ge — best deals every day." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { language } = useI18n();
  return <LegalPage doc={ABOUT[language]} />;
}
