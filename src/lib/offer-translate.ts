import { translateOfferText } from "@/lib/ai-offer.functions";

type Langs = "en" | "ru" | "tr" | "fa";

export type OfferTranslationForm = {
  title: string;
  description: string;
  title_en: string;
  title_ru: string;
  title_tr: string;
  title_fa: string;
  description_en: string;
  description_ru: string;
  description_tr: string;
  description_fa: string;
};

export type OfferTranslationFields = Record<
  `title_${Langs}` | `description_${Langs}`,
  string | null
>;

/**
 * Fills in any translation field the partner left blank using the AI gateway.
 * Manually-typed values always win. Never throws — on failure the missing
 * fields stay `null` and `localizedField` falls back to Georgian.
 */
export async function resolveOfferTranslations(
  form: OfferTranslationForm,
  descriptionOverride?: string,
): Promise<OfferTranslationFields> {
  const title = form.title.trim();
  const description = (descriptionOverride ?? form.description).trim();

  const needsTitle =
    !form.title_en.trim() || !form.title_ru.trim() || !form.title_tr.trim() || !form.title_fa.trim();
  const needsDescription =
    !!description &&
    (!form.description_en.trim() ||
      !form.description_ru.trim() ||
      !form.description_tr.trim() ||
      !form.description_fa.trim());

  let auto: Awaited<ReturnType<typeof translateOfferText>> | null = null;
  if (title && (needsTitle || needsDescription)) {
    try {
      auto = await translateOfferText({ data: { title, description } });
    } catch (err) {
      console.warn("Offer auto-translation failed, publishing without it:", err);
    }
  }

  const pick = (manual: string, value: string | undefined) => manual.trim() || value?.trim() || null;

  return {
    title_en: pick(form.title_en, auto?.en?.title),
    title_ru: pick(form.title_ru, auto?.ru?.title),
    title_tr: pick(form.title_tr, auto?.tr?.title),
    title_fa: pick(form.title_fa, auto?.fa?.title),
    description_en: description ? pick(form.description_en, auto?.en?.description) : null,
    description_ru: description ? pick(form.description_ru, auto?.ru?.description) : null,
    description_tr: description ? pick(form.description_tr, auto?.tr?.description) : null,
    description_fa: description ? pick(form.description_fa, auto?.fa?.description) : null,
  };
}
