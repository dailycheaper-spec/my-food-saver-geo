import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { PRIVACY } from "@/lib/legal-content";
import { useI18n } from "@/lib/i18n";

const TITLE = "კონფიდენციალურობის პოლიტიკა — Cheaper";
const DESC =
  "როგორ ვაგროვებთ, ვიყენებთ და ვიცავთ შენს პერსონალურ მონაცემებს Cheaper-ზე — ანგარიში, მდებარეობა, შეკვეთები და გადახდები.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: "https://cheaper.ge/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://cheaper.ge/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { language } = useI18n();
  return <LegalPage doc={PRIVACY[language]} />;
}
