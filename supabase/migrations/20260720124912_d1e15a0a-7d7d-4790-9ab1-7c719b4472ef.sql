
-- Drop recursive policies on stores that reference store_members (which itself references stores)
DROP POLICY IF EXISTS "Store owners and members can view their stores" ON public.stores;

-- Replace with non-recursive version using security definer is_store_member()
CREATE POLICY "Store members can view their stores"
ON public.stores FOR SELECT
TO authenticated
USING (owner_id = auth.uid() OR public.is_store_member(auth.uid(), id));

-- Drop recursive policy on store_members that references stores
DROP POLICY IF EXISTS "Store owners can view their own memberships" ON public.store_members;
DROP POLICY IF EXISTS "Store owners can add their own membership" ON public.store_members;

-- Drop recursive offers policy that does EXISTS on stores (triggers stores policies)
DROP POLICY IF EXISTS "Store owners manage offers" ON public.offers;
