GRANT SELECT ON public.saved_products TO anon;

CREATE POLICY "anyone reads linked active addons"
ON public.saved_products
FOR SELECT
TO anon, authenticated
USING (
  is_addon = true
  AND addon_active = true
  AND EXISTS (
    SELECT 1 FROM public.offer_addons oa
    WHERE oa.saved_product_id = saved_products.id
      AND oa.is_active = true
  )
);