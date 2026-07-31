import { mergePacks, type DomainPack } from "./types";
import { commonPack } from "./common";
import { customerPack } from "./customer";
import { partnerPack } from "./partner";
import { adminPack } from "./admin";
import { mapsPack } from "./maps";
import { systemPack } from "./system";

export type { DomainPack };

/** All domain packs merged into one per-language dictionary. */
export const domainLabels: DomainPack = mergePacks(
  commonPack,
  customerPack,
  partnerPack,
  adminPack,
  mapsPack,
  systemPack,
);

