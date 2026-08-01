import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";
import { ABOUT } from "@/lib/legal-content";
import { useI18n } from "@/lib/i18n";

const TITLE = "ჩვენ შესახებ — Cheaper";
const DESC =
  "Cheaper აერთიანებს თბილისის, ბათუმის და ქუთაისის საცხობებს, რესტორნებსა და მარკეტებს, რომ ყოველდღიური საკვები 50%+ ფასდაკლებით იყიდო.";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: "https://cheaper.ge/about" },
    ],
    links: [{ rel: "canonical", href: "https://cheaper.ge/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { language } = useI18n();
  return <LegalPage doc={ABOUT[language]} />;
}
