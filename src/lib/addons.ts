/** Add-on ("ხელს გააყოლე") shared constants. */
export const ADDON_CATEGORIES = [
  "drinks",
  "water",
  "juice",
  "coffee_tea",
  "desserts",
  "sauces",
  "sides",
  "snacks",
  "extra_portion",
  "other",
] as const;

export type AddonCategory = (typeof ADDON_CATEGORIES)[number];

export function addonCategoryKey(category: string): string {
  return `partner.addons.cat.${category}`;
}
