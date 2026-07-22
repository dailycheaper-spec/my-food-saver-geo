import { createServerFn } from "@tanstack/react-start";

export const getStoreFollowerCount = createServerFn({ method: "GET" })
  .inputValidator((data: { storeId: string }) => {
    if (!data?.storeId || typeof data.storeId !== "string") {
      throw new Error("storeId is required");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error } = await supabaseAdmin
      .from("store_follows")
      .select("id", { count: "exact", head: true })
      .eq("store_id", data.storeId);
    if (error) throw new Error(error.message);
    return { count: count ?? 0 };
  });
