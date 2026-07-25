// Small helper for rendering a store's logo which may be either:
// - a URL (uploaded image via store-logos bucket → signed URL stored in logo_url), or
// - an emoji / short text (legacy `logo` column).
// Consumers pass whichever value they have (URL preferred, emoji fallback).
export function isLogoUrl(v: string | null | undefined): boolean {
  return !!v && /^(https?:|\/|data:|blob:)/i.test(v);
}

interface Props {
  value: string | null | undefined;
  className?: string;
  emojiClassName?: string;
  alt?: string;
  fallback?: string;
}

/**
 * Renders a store logo. If `value` looks like a URL, renders an <img>; otherwise
 * renders the emoji/text inside a span. The wrapper element (styling — size,
 * rounded, background, grid centering) must be provided by the caller.
 */
export function StoreLogo({ value, className = "w-full h-full object-cover", emojiClassName, alt = "", fallback = "🏪" }: Props) {
  if (isLogoUrl(value)) {
    return <img src={value as string} alt={alt} className={className} />;
  }
  return <span className={emojiClassName}>{value || fallback}</span>;
}
