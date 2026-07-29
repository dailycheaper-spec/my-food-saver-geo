
create policy "offer_images_insert_authenticated"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'offer-images');

create policy "offer_images_update_authenticated"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'offer-images')
  with check (bucket_id = 'offer-images');

create policy "offer_images_delete_authenticated"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'offer-images');

create policy "offer_images_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'offer-images');
