import type { SVGProps } from "react";
import type { Category } from "@/lib/mock-data";

/**
 * Line-art category icons.
 *
 * All icons use a 24x24 viewBox, stroke-only artwork with `currentColor`,
 * round caps/joins and a 1.75 stroke width, so they inherit the chip's
 * active/inactive text color automatically (light mode, dark mode, and the
 * inverted state on the green active chip).
 *
 * To replace an icon with a custom one, swap only the <path>/<shape> children
 * of the matching component below and keep the wrapper props intact.
 */

type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** ყველა — All */
function AllIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5l1.7 4.3 4.3 1.7-4.3 1.7-1.7 4.3-1.7-4.3L6 9.5l4.3-1.7L12 3.5Z" />
      <path d="M18.5 15.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8.8-1.9Z" />
      <path d="M5.5 14l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4L3.5 16l1.4-.6.6-1.4Z" />
    </Svg>
  );
}

/** საცხობი — Bakery (baguette) */
function BakeryIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.6 19.4a2.7 2.7 0 0 1 0-3.8L15.6 4.6a2.7 2.7 0 0 1 3.8 3.8L8.4 19.4a2.7 2.7 0 0 1-3.8 0Z" />
      <path d="M9.6 8.9l1.6 1.6M12.2 6.3l1.6 1.6M7 11.5l1.6 1.6" />
    </Svg>
  );
}

/** საკონდიტრო — Patisserie (cake slice) */
function PatisserieIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 14.2 12 8.5l8.5 5.7v3.3a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-3.3Z" />
      <path d="M3.5 14.2 12 19v-4.8l8.5 0" />
      <path d="M12 8.5V6.2M9.6 8.6c.8-1 1.6-1 2.4 0s1.6 1 2.4 0" />
    </Svg>
  );
}

/** რესტორანი — Restaurant (fork & knife) */
function RestaurantIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 3.5v6a2.5 2.5 0 0 0 5 0v-6" />
      <path d="M9.5 12v8.5M7 3.5v4.2M12 3.5v4.2" />
      <path d="M17.5 20.5v-7.8c1.6-.5 2.5-2 2.5-4.4 0-2.6-1-4.8-2.5-4.8S15 5.7 15 8.3c0 2.4.9 3.9 2.5 4.4Z" />
    </Svg>
  );
}

/** სუპერმარკეტი — Market (shopping cart) */
function MarketIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.8 3.8h2.4l2.3 10.4a1.7 1.7 0 0 0 1.7 1.3h7.8a1.7 1.7 0 0 0 1.7-1.3l1.5-6.6H6" />
      <circle cx="9.5" cy="19.5" r="1.3" />
      <circle cx="17" cy="19.5" r="1.3" />
    </Svg>
  );
}

/** კაფე — Cafe (coffee cup) */
function CafeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 9h12v5.5a4.5 4.5 0 0 1-4.5 4.5h-3A4.5 4.5 0 0 1 4 14.5V9Z" />
      <path d="M16 10.5h1.8a2.6 2.6 0 0 1 0 5.2H16" />
      <path d="M7.5 3v2.5M11 3v2.5" />
    </Svg>
  );
}

/** სუში — Sushi (nigiri + chopsticks) */
function SushiIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="12.5" width="12.5" height="6" rx="3" />
      <path d="M6.6 12.5c0-1.7 1.4-3 3.1-3s3.1 1.3 3.1 3" />
      <path d="M9.7 12.5v6M6 15.5h7" />
      <path d="M20.5 4.5 16 12M21 8.2l-3.2 5" />
    </Svg>
  );
}

/** პიცა — Pizza (slice) */
function PizzaIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.2 20.8 19a1.4 1.4 0 0 1-1.6 2A20 20 0 0 1 12 22.2 20 20 0 0 1 4.8 21a1.4 1.4 0 0 1-1.6-2L12 3.2Z" />
      <path d="M5.6 15.6a20 20 0 0 0 12.8 0" />
      <path d="M11 9.5h.01M9 14.5h.01M14.5 14.5h.01" strokeWidth={2.4} />
    </Svg>
  );
}

const ICONS: Record<Category | "ყველა", (props: IconProps) => JSX.Element> = {
  "ყველა": AllIcon,
  "საცხობი": BakeryIcon,
  "საკონდიტრო": PatisserieIcon,
  "რესტორანი": RestaurantIcon,
  "სუპერმარკეტი": MarketIcon,
  "კაფე": CafeIcon,
  "სუში": SushiIcon,
  "პიცა": PizzaIcon,
};

export function CategoryIcon({
  id,
  className = "w-6 h-6",
  ...props
}: { id: Category | "ყველა"; className?: string } & IconProps) {
  const Icon = ICONS[id] ?? AllIcon;
  return <Icon className={className} {...props} />;
}

export default CategoryIcon;
