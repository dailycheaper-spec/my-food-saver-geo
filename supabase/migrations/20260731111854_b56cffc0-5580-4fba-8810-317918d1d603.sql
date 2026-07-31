CREATE TABLE public.promo_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  image_url text,
  image_path text,
  overlay_class text,
  link_to text NOT NULL DEFAULT '/search',
  link_search jsonb,
  badge_ka text, badge_en text, badge_ru text, badge_tr text, badge_fa text,
  headline_ka text NOT NULL, headline_en text, headline_ru text, headline_tr text, headline_fa text,
  subtext_ka text NOT NULL DEFAULT '', subtext_en text, subtext_ru text, subtext_tr text, subtext_fa text,
  button_ka text NOT NULL DEFAULT '', button_en text, button_ru text, button_tr text, button_fa text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.promo_banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_banners TO authenticated;
GRANT ALL ON public.promo_banners TO service_role;

ALTER TABLE public.promo_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active banners"
  ON public.promo_banners FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can view all banners"
  ON public.promo_banners FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert banners"
  ON public.promo_banners FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update banners"
  ON public.promo_banners FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete banners"
  ON public.promo_banners FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_promo_banners_updated_at
  BEFORE UPDATE ON public.promo_banners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_promo_banners_position ON public.promo_banners (position, created_at);

-- Seed the three banners currently hard-coded on the homepage.
INSERT INTO public.promo_banners
  (position, active, image_url, link_to,
   badge_ka, badge_en, badge_ru, badge_tr, badge_fa,
   headline_ka, headline_en, headline_ru, headline_tr, headline_fa,
   subtext_ka, subtext_en, subtext_ru, subtext_tr, subtext_fa,
   button_ka, button_en, button_ru, button_tr, button_fa)
VALUES
  (0, true, 'asset:hero-bakery-clean', '/search',
   'ხარისხიანი ფასი, უკეთესი საკვები', 'Quality price, better food', 'Качественная цена, лучшая еда', 'Kaliteli fiyat, daha iyi yemek', 'قیمت باکیفیت، غذای بهتر',
   'ყოველდღე 50%+ ფასდაკლებით', 'Every day 50%+ off', 'Каждый день скидка 50%+', 'Her gün %50+ indirim', 'هر روز بیش از ۵۰٪ تخفیف',
   'გემრიელი საკვები საყვარელი ადგილებიდან!', 'Tasty food from your favorite spots!', 'Вкусная еда из любимых мест!', 'Sevdiğiniz mekanlardan lezzetli yemekler!', 'غذای خوشمزه از مکان‌های موردعلاقه‌تان!',
   'შეუკვეთე', 'Order now', 'Заказать', 'Şimdi sipariş ver', 'اکنون سفارش دهید'),
  (1, true, 'asset:bag-bakery', '/search',
   'დაზოგე ყოველ შეკვეთაზე', 'Save on every order', 'Экономьте на каждом заказе', 'Her siparişte tasarruf', 'در هر سفارش صرفه‌جویی کنید',
   'დაზოგეთ მეტი', 'Save more', 'Экономьте больше', 'Daha fazla tasarruf', 'بیشتر صرفه‌جویی کنید',
   'დღის ბოლოს ფასები ორჯერ და მეტჯერ ეცემა.', 'End-of-day prices drop by half and more.', 'К концу дня цены падают вдвое и больше.', 'Gün sonunda fiyatlar yarı yarıya ve daha fazla düşer.', 'در پایان روز قیمت‌ها نصف و کمتر می‌شوند.',
   'ნახე შეთავაზებები', 'See offers', 'Смотреть предложения', 'Teklifleri gör', 'مشاهده پیشنهادها'),
  (2, true, 'asset:bag-khachapuri', '/search',
   'ყველაზე მოთხოვნადი', 'Most wanted', 'Самое популярное', 'En çok tercih edilen', 'پرطرفدارترین',
   'პოპულარული დღის კერძი', 'Popular dish of the day', 'Популярное блюдо дня', 'Günün popüler yemeği', 'غذای محبوب روز',
   'ის, რასაც დღეს ყველაზე მეტად ყიდულობენ შენს უბანში.', 'What everyone is buying in your neighborhood today.', 'То, что сегодня чаще всего покупают рядом с вами.', 'Bugün mahallende en çok alınan ürün.', 'چیزی که امروز در محله شما بیشترین خرید را دارد.',
   'შეუკვეთე', 'Order now', 'Заказать', 'Şimdi sipariş ver', 'اکنون سفارش دهید');

-- Banner artwork: readable by everyone, writable by admins only.
CREATE POLICY "Anyone can view banner images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'promo-banners');

CREATE POLICY "Admins can upload banner images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'promo-banners' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update banner images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'promo-banners' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'promo-banners' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete banner images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'promo-banners' AND public.has_role(auth.uid(), 'admin'));