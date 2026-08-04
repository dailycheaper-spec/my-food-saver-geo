import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getPlatformSettings } from "@/lib/contracts.functions";
import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/contracts";

/**
 * The real, server-authoritative commission % — the same value the payout
 * cron and the contract text use. Admin UI must read this, not the old
 * localStorage-only `commissionPct` (which nothing downstream honors).
 */
export function usePlatformCommissionPct(): number {
  const load = useServerFn(getPlatformSettings);
  const { data } = useQuery({ queryKey: ["platform-settings"], queryFn: () => load() });
  return data?.commission_percentage ?? DEFAULT_PLATFORM_SETTINGS.commission_percentage;
}
