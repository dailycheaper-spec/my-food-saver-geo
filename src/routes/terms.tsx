import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { TERMS } from "@/lib/legal-content";
import { useI18n } from "@/lib/i18n";

const TITLE = "წესები და პირობები — Cheaper";
const DESC =
  "Cheaper-ის მომსახურების წესები: შეკვეთა, გადახდა, პროდუქტის გატანა, დაბრუნება და პარტნიორ მაღაზიებთან ურთიერთობის პირობები.";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: "https://cheaper.ge/terms" },
    ],
    links: [{ rel: "canonical", href: "https://cheaper.ge/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  const { language } = useI18n();
  return <LegalPage doc={TERMS[language]} />;
}
