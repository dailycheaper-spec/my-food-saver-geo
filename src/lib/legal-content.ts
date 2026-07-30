import type { Language } from "@/lib/i18n";

export const COMPANY = {
  nameKa: "შ.პ.ს. „გეოკუბი“",
  nameEn: "LLC Geokubi",
  nameRu: "ООО «Геокуби»",
  id: "404715947",
  addressKa: "ვასილ ბარნოვის 71, თბილისი, საქართველო, 0179",
  addressEn: "71 Vasil Barnovi Str., Tbilisi, Georgia, 0179",
  addressRu: "ул. Василия Барнови 71, Тбилиси, Грузия, 0179",
  nameTr: "Geokubi LLC",
  addressTr: "Vasil Barnovi Cad. 71, Tiflis, Gürcistan, 0179",
  nameFa: "Geokubi LLC",
  addressFa: "خیابان واسیل بارنووی ۷۱، تفلیس، گرجستان، ۰۱۷۹",
  phone: "+995 599 161 187",
  email: "dailycheaper@gmail.com",
};

type Section = { title: string; body: string };
export type LegalDoc = {
  title: string;
  subtitle: string;
  back: string;
  sections: Section[];
};

// ================= ABOUT =================
export const ABOUT: Record<Language, LegalDoc> = {
  ka: {
    title: "ჩვენს შესახებ",
    subtitle: "Cheaper.ge — საუკეთესო შეთავაზებები, ყოველდღე.",
    back: "უკან",
    sections: [
      {
        title: "ვინ ვართ",
        body: `Cheaper.ge არის პლატფორმა, რომელიც ყოველდღიურად გაძლევთ შესაძლებლობას აღმოაჩინოთ საუკეთესო ფასდაკლებები რესტორნებში, კაფეებში, საცხობებსა და სხვა კვების ობიექტებში.

ჩვენი მიზანია, ხარისხიანი საკვები ყველასთვის უფრო ხელმისაწვდომი გავხადოთ. Cheaper.ge-ზე ერთ სივრცეში იპოვით მრავალფეროვან ყოველდღიურ შეთავაზებებს, სპეციალურ ფასებსა და ექსკლუზიურ შეთავაზებებს, რომლებიც დაგეხმარებათ ისიამოვნოთ თქვენი საყვარელი კერძებით უფრო ხელსაყრელ ფასად.

ჩვენ ვაერთიანებთ მომხმარებლებსა და პარტნიორ ობიექტებს, რათა ფასდაკლებების მოძიება, დაჯავშნა და გამოყენება იყოს მარტივი, სწრაფი და კომფორტული.`,
      },
      {
        title: "რატომ Cheaper.ge?",
        body: `• ყოველდღიურად განახლებადი შეთავაზებები
• საუკეთესო ფასები თქვენს საყვარელ ობიექტებში
• მარტივი დაჯავშნა რამდენიმე დაწკაპუნებით
• სანდო პარტნიორი ობიექტები
• სწრაფი და მოსახერხებელი გამოცდილება

ჩვენ გვჯერა, რომ კარგი შეთავაზება ყველას უნდა ჰქონდეს ხელმისაწვდომი. სწორედ ამიტომ ვქმნით პლატფორმას, სადაც ხარისხი, კომფორტი და დაზოგვა ერთიანდება.`,
      },
      {
        title: "საკონტაქტო ინფორმაცია",
        body: `კომპანია: ${COMPANY.nameKa}
საიდენტიფიკაციო კოდი: ${COMPANY.id}
მისამართი: ${COMPANY.addressKa}
ტელეფონი: ${COMPANY.phone}
ელფოსტა: ${COMPANY.email}`,
      },
    ],
  },
  en: {
    title: "About Us",
    subtitle: "Cheaper.ge — the best deals, every day.",
    back: "Back",
    sections: [
      {
        title: "Who we are",
        body: `Cheaper.ge is a platform that helps you discover the best daily discounts at restaurants, cafés, bakeries and other food venues.

Our mission is to make quality food more accessible for everyone. On Cheaper.ge you'll find a wide range of daily deals, special prices and exclusive offers that let you enjoy your favorite meals at a much better price.

We connect customers and partner venues so that finding, booking and using discounts is simple, fast and comfortable.`,
      },
      {
        title: "Why Cheaper.ge?",
        body: `• Offers refreshed every day
• Best prices at your favorite places
• Easy booking in just a few taps
• Trusted partner venues
• Fast and convenient experience

We believe great offers should be available to everyone. That's why we build a platform where quality, comfort and savings come together.`,
      },
      {
        title: "Contact information",
        body: `Company: ${COMPANY.nameEn}
Company ID: ${COMPANY.id}
Address: ${COMPANY.addressEn}
Phone: ${COMPANY.phone}
Email: ${COMPANY.email}`,
      },
    ],
  },
  tr: {
    title: "Hakkımızda",
    subtitle: "Cheaper.ge — her gün en iyi fırsatlar.",
    back: "Geri",
    sections: [
      {
        title: "Biz kimiz",
        body: `Cheaper.ge, restoranlarda, kafelerde, fırınlarda ve diğer gıda işletmelerinde en iyi günlük indirimleri keşfetmenize yardımcı olan bir platformdur.

Misyonumuz, kaliteli yemeği herkes için daha erişilebilir hale getirmektir. Cheaper.ge'de en sevdiğiniz yemekleri çok daha uygun fiyatlarla tadabilmeniz için geniş bir günlük fırsat, özel fiyat ve özel teklif yelpazesi bulacaksınız.

Müşterileri ve iş ortağı işletmeleri bir araya getiriyoruz; böylece indirimleri bulmak, rezerve etmek ve kullanmak basit, hızlı ve konforlu hale geliyor.`,
      },
      {
        title: "Neden Cheaper.ge?",
        body: `• Her gün yenilenen fırsatlar
• En sevdiğiniz mekanlarda en iyi fiyatlar
• Birkaç dokunuşla kolay rezervasyon
• Güvenilir iş ortağı işletmeler
• Hızlı ve pratik deneyim

Harika fırsatların herkes için erişilebilir olması gerektiğine inanıyoruz. Bu yüzden kalite, konfor ve tasarrufu bir araya getiren bir platform inşa ediyoruz.`,
      },
      {
        title: "İletişim bilgileri",
        body: `Şirket: ${COMPANY.nameTr}
Şirket Kimlik No: ${COMPANY.id}
Adres: ${COMPANY.addressTr}
Telefon: ${COMPANY.phone}
E-posta: ${COMPANY.email}`,
      },
    ],
  },
  fa: {
    title: "درباره ما",
    subtitle: "Cheaper.ge — بهترین پیشنهادها، هر روز.",
    back: "بازگشت",
    sections: [
      {
        title: "ما کی هستیم",
        body: `Cheaper.ge پلتفرمی است که به شما کمک می‌کند بهترین تخفیف‌های روزانه رستوران‌ها، کافه‌ها، نانوایی‌ها و سایر مراکز غذایی را کشف کنید.

مأموریت ما این است که غذای باکیفیت را برای همه در دسترس‌تر کنیم. در Cheaper.ge طیف گسترده‌ای از پیشنهادهای روزانه، قیمت‌های ویژه و تخفیف‌های انحصاری پیدا می‌کنید که به شما امکان می‌دهد غذاهای مورد علاقه‌تان را با قیمتی بسیار مناسب‌تر تجربه کنید.

ما مشتریان و کسب‌وکارهای همکار را به هم متصل می‌کنیم تا یافتن، رزرو کردن و استفاده از تخفیف‌ها ساده، سریع و راحت باشد.`,
      },
      {
        title: "چرا Cheaper.ge؟",
        body: `• پیشنهادهایی که هر روز به‌روزرسانی می‌شوند
• بهترین قیمت‌ها در مکان‌های مورد علاقه شما
• رزرو آسان تنها با چند ضربه
• کسب‌وکارهای همکار قابل‌اعتماد
• تجربه‌ای سریع و راحت

ما معتقدیم پیشنهادهای عالی باید برای همه در دسترس باشد. به همین دلیل پلتفرمی می‌سازیم که کیفیت، راحتی و صرفه‌جویی را کنار هم می‌آورد.`,
      },
      {
        title: "اطلاعات تماس",
        body: `شرکت: ${COMPANY.nameFa}
شناسه شرکت: ${COMPANY.id}
آدرس: ${COMPANY.addressFa}
تلفن: ${COMPANY.phone}
ایمیل: ${COMPANY.email}`,
      },
    ],
  },
  ru: {
    title: "О нас",
    subtitle: "Cheaper.ge — лучшие предложения каждый день.",
    back: "Назад",
    sections: [
      {
        title: "Кто мы",
        body: `Cheaper.ge — это платформа, которая каждый день помогает вам находить лучшие скидки в ресторанах, кафе, пекарнях и других заведениях питания.

Наша цель — сделать качественную еду доступной для каждого. На Cheaper.ge в одном месте вы найдёте разнообразные ежедневные предложения, специальные цены и эксклюзивные акции, которые позволят наслаждаться любимыми блюдами по более выгодной цене.

Мы объединяем пользователей и партнёрские заведения, чтобы поиск, бронирование и использование скидок были простыми, быстрыми и удобными.`,
      },
      {
        title: "Почему Cheaper.ge?",
        body: `• Ежедневно обновляемые предложения
• Лучшие цены в ваших любимых заведениях
• Простое бронирование в несколько нажатий
• Надёжные партнёрские заведения
• Быстрый и удобный сервис

Мы верим, что хорошее предложение должно быть доступно каждому. Именно поэтому мы создаём платформу, где сочетаются качество, комфорт и экономия.`,
      },
      {
        title: "Контактная информация",
        body: `Компания: ${COMPANY.nameRu}
Идентификационный код: ${COMPANY.id}
Адрес: ${COMPANY.addressRu}
Телефон: ${COMPANY.phone}
Эл. почта: ${COMPANY.email}`,
      },
    ],
  },
};

// ================= PRIVACY =================
export const PRIVACY: Record<Language, LegalDoc> = {
  ka: {
    title: "კონფიდენციალურობის პოლიტიკა",
    subtitle: `${COMPANY.nameKa} · cheaper.ge`,
    back: "უკან",
    sections: [
      {
        title: "შესავალი",
        body: `წინამდებარე ვებგვერდი cheaper.ge (შემდგომში „ვებგვერდი") არის ${COMPANY.nameKa}-ს (ს/კ ${COMPANY.id}) (შემდგომში „ჩვენ") საკუთრება.

ეს გვერდი გაუწყებთ, თუ როგორ ვაგროვებთ, ვამუშავებთ და ვიყენებთ ჩვენი ვებგვერდის მომხმარებლების პერსონალურ მონაცემებს.

თქვენ მიერ მოწოდებულ პერსონალურ მონაცემებს ვიყენებთ ჩვენი სერვისისა და ვებგვერდის გასაუმჯობესებლად. ვებგვერდის გამოყენებით, თქვენ ეთანხმებით ჩვენ მიერ თქვენი პერსონალური მონაცემების დამუშავებას კანონით გათვალისწინებული წესით, წინამდებარე კონფიდენციალურობის პოლიტიკით განსაზღვრული მიზნებისათვის.`,
      },
      {
        title: "რა მონაცემებს ვაგროვებთ",
        body: `ჩვენი კომპანია აგროვებს მონაცემებს, რომლებიც მოიცავს პირად საიდენტიფიკაციო მონაცემებს: სახელი, გვარი, ელფოსტა, მისამართი, ტელეფონის ნომერი.

ჩვენ არ ვინახავთ და არ ვიყენებთ „ქუქი" ფაილებს (cookies).`,
      },
      {
        title: "როგორ ვაგროვებთ თქვენს მონაცემებს",
        body: `ჩვენ მიერ შეგროვებული ინფორმაციის უდიდეს ნაწილს თქვენ პირდაპირ გვაწვდით. ჩვენ ვაგროვებთ და ვამუშავებთ მონაცემებს, როდესაც თქვენ:

• რეგისტრირდებით ჩვენს ვებგვერდზე ან განათავსებთ შეკვეთას ჩვენთან განთავსებული პროდუქტისა და მომსახურების მისაღებად;
• ნებაყოფლობით ავსებთ მომხმარებლის კვლევას ან გამოგვეხმაურებით ელფოსტის ან სხვა საშუალებით.

ზემოთ მოცემული ჩამონათვალი არ არის ამომწურავი და შესაძლოა, ჩვენთან ურთიერთობის დროს სხვა არაპირდაპირი წყაროებიდანაც შეგროვდეს პერსონალური მონაცემები.`,
      },
      {
        title: "როგორ გამოვიყენებთ თქვენს მონაცემებს",
        body: `ჩვენი კომპანია აგროვებს თქვენს მონაცემებს, რათა შევძლოთ:

• თქვენი შეკვეთის დამუშავება, ანგარიშის მართვა, პროდუქციის მოწოდება;
• თქვენთვის ელფოსტით სპეციალური შემოთავაზებების გამოგზავნა ჩვენი სერვისებისა და პროდუქტების შესახებ;
• ვებგვერდის ტექნიკური ადმინისტრირება და მისი განვითარება.`,
      },
      {
        title: "როგორ ვინახავთ თქვენს მონაცემებს",
        body: `ვიყენებთ ხელმისაწვდომ ტექნიკურ და ორგანიზაციულ ზომებს, რათა თქვენი პერსონალური მონაცემები დაცული იყოს უნებართვო წვდომისგან, გამოყენებისგან, დაკარგვისა თუ განადგურებისგან.

მონაცემები ინახება მოქმედი კანონმდებლობით განსაზღვრული წესით, საჭირო პერიოდით. მიზნების ამოწურვის შემდეგ ჩვენ წავშლით/გავანადგურებთ თქვენს პერსონალურ მონაცემებს. კონფიდენციალური ინფორმაცია ინახება მომსახურების დასრულებიდან 1 წლის განმავლობაში.`,
      },
      {
        title: "მონაცემთა დამუშავების მიზანი",
        body: `Cheaper.ge-ზე რეგისტრაციით ან/და შეკვეთის განთავსებით მომხმარებელი აცხადებს თანხმობას მისი პერსონალური მონაცემების შემდეგი მიზნებით გამოყენებაზე:

• მომსახურების ხარისხის გაუმჯობესება;
• Cheaper.ge-ის კანონისმიერი ვალდებულებების შესრულება;
• მომხმარებლის პრეტენზიების აღმოფხვრა;
• აქტივობების მონიტორინგი ვებგვერდზე;
• განახლებული მონაცემების შესახებ შეტყობინება;
• ეფექტიანი კომუნიკაცია და უკუკავშირი;
• სამიზნე ჯგუფებისთვის სიახლეების შეთავაზება;
• მარკეტინგული და სხვა აქტივობები;
• შესყიდულ პროდუქციაზე ინფორმაციის მიწოდება;
• სისტემის არამართლზომიერი გამოყენების პრევენცია;
• ხელშეკრულებით გათვალისწინებული ვალდებულებების შესრულება;
• სხვა ლეგიტიმური მიზნები საქართველოს კანონმდებლობის შესაბამისად.`,
      },
      {
        title: "თქვენი უფლებები",
        body: `ვებგვერდის ნებისმიერ მომხმარებელს უფლება აქვს უსასყიდლოდ მიიღოს ინფორმაცია:

• მუშავდება თუ არა მის შესახებ მონაცემები და რა საფუძვლით;
• დამუშავებული მონაცემების, მიზნისა და საფუძვლის შესახებ;
• მონაცემთა შეგროვების წყაროსა და შენახვის ვადის შესახებ;
• მონაცემთა მიმღების ვინაობის შესახებ.

აგრეთვე:
• გაეცნოს მის შესახებ არსებულ მონაცემებს და მიიღოს მათი ასლი;
• მოითხოვოს გასწორება, განახლება, შევსება, დაბლოკვა, დამუშავების შეწყვეტა, წაშლა ან განადგურება;
• მოითხოვოს დამუშავების შეზღუდვა;
• გამოიხმოს თანხმობა ნებისმიერ დროს განმარტების გარეშე;
• გაასაჩივროს — მიმართოს თბილისის საქალაქო სასამართლოს (მის.: ქ. თბილისი, დავით აღმაშენებლის ხეივანი №64).

მოთხოვნის შემთხვევაში ჩვენ ვალდებული ვართ გიპასუხოთ 10 დღის განმავლობაში.`,
      },
      {
        title: "მარკეტინგული მიზნებით დამუშავება",
        body: `Cheaper.ge-ის პლატფორმაზე რეგისტრაციით და/ან მომსახურების მიღებით თქვენ ადასტურებთ, რომ თანახმა ხართ, თქვენი მონაცემები დამუშავდეს პირდაპირი მარკეტინგის მიზნებისთვის.

თქვენ უფლება გაქვთ ნებისმიერ დროს გამოიხმოთ თანხმობა. მოთხოვნის შემდეგ ვამუშავებთ არაუგვიანეს 7 სამუშაო დღეში.`,
      },
      {
        title: "ცვლილებები",
        body: `ჩვენი კომპანია მუდმივად შეუსაბამებს კონფიდენციალურობის პოლიტიკას მოქმედ კანონმდებლობასა და პრინციპებს; შესაბამისი განახლებები აისახება ვებგვერდზე.`,
      },
      {
        title: "როგორ შეგვეხმიანოთ",
        body: `თუ გაქვთ შეკითხვა კონფიდენციალურობის პოლიტიკის თაობაზე ან გსურთ თქვენი უფლებების გამოყენება, დაგვიკავშირდით:

ელფოსტა: ${COMPANY.email}
ტელეფონი: ${COMPANY.phone}
მისამართი: ${COMPANY.addressKa}`,
      },
      {
        title: "როგორ შეეხმიანოთ უფლებამოსილ ორგანოებს",
        body: `თუ მიგაჩნიათ, რომ თქვენი მონაცემების დამუშავებისას დაირღვა თქვენი უფლებები, მიმართეთ სახელმწიფო ინსპექტორის სამსახურს:

ტელეფონი: (+995 32) 242 1000
ელფოსტა: office@stateinspector.ge
მისამართი: საქართველო, თბილისი, ნ. ვაჩნაძის №7, 0105`,
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    subtitle: `${COMPANY.nameEn} · cheaper.ge`,
    back: "Back",
    sections: [
      {
        title: "Introduction",
        body: `This website cheaper.ge (the "Website") is owned by ${COMPANY.nameEn} (Company ID ${COMPANY.id}) (the "Company", "we").

This page explains how we collect, process and use personal data of our website users.

We use the personal data you provide to improve our services and website. By using the Website, you agree that we process your personal data in accordance with applicable law and for the purposes described in this Privacy Policy.`,
      },
      {
        title: "What data we collect",
        body: `We collect data that includes personal identification information: first name, last name, email, address, phone number.

We do not store or use cookies.`,
      },
      {
        title: "How we collect your data",
        body: `Most of the information is provided directly by you. We collect and process data when you:

• register on our website or place an order for products and services;
• voluntarily complete a customer survey or contact us via email or other means.

The list above is not exhaustive; personal data may also be collected indirectly during our interactions.`,
      },
      {
        title: "How we use your data",
        body: `We collect your data to:

• process your order, manage your account and deliver products;
• send you special offers about our services and products by email;
• administer and improve the website.`,
      },
      {
        title: "How we store your data",
        body: `We use reasonable technical and organizational security measures to protect personal data obtained through the website from unauthorized access, use, loss or destruction.

Data is retained in accordance with applicable law for as long as needed to fulfil the stated purposes. After the purposes cease to exist, we delete or destroy your personal data. Confidential information is stored for 1 year after the service is completed.`,
      },
      {
        title: "Purpose of processing",
        body: `By registering on Cheaper.ge and/or placing an order, the user consents to processing of personal data for the following purposes:

• improving service quality;
• fulfilling legal obligations of Cheaper.ge;
• resolving user complaints;
• monitoring user activity on the website;
• notifying users about updates;
• effective communication and feedback;
• identifying user groups for news and offers;
• marketing and other activities;
• providing information about purchased products;
• preventing unlawful use of the system;
• performing contractual obligations;
• other legitimate purposes under Georgian legislation.`,
      },
      {
        title: "Your rights",
        body: `Every user of the website has the right to receive, free of charge, information about:

• whether their data is being processed and on what grounds;
• the data processed, the purpose and the legal basis;
• the source of collection and the retention period;
• the recipients of the data.

You also have the right to:
• access your data and receive copies;
• request rectification, completion, blocking, restriction, deletion or destruction;
• restrict processing;
• withdraw consent at any time without explanation;
• lodge a complaint with the Tbilisi City Court (64 David Aghmashenebeli Alley, Tbilisi).

We are obliged to respond to your request within 10 days.`,
      },
      {
        title: "Marketing processing",
        body: `By registering and/or using services on Cheaper.ge you consent to processing of your data for direct marketing purposes.

You may withdraw consent at any time. We will stop marketing processing within 7 working days after receiving your request.`,
      },
      {
        title: "Changes",
        body: `We continuously align this Privacy Policy with applicable law and best practices; updates are reflected on the website.`,
      },
      {
        title: "How to contact us",
        body: `If you have questions about this Privacy Policy or wish to exercise your rights, please contact us:

Email: ${COMPANY.email}
Phone: ${COMPANY.phone}
Address: ${COMPANY.addressEn}`,
      },
      {
        title: "Contacting the supervisory authority",
        body: `If you believe your rights have been violated when processing your data, contact the State Inspector's Service:

Phone: (+995 32) 242 1000
Email: office@stateinspector.ge
Address: 7 N. Vachnadze Str., Tbilisi 0105, Georgia`,
      },
    ],
  },
  tr: {
    title: "Gizlilik Politikası",
    subtitle: `${COMPANY.nameTr} · cheaper.ge`,
    back: "Geri",
    sections: [
      {
        title: "Giriş",
        body: `Bu web sitesi cheaper.ge ("Web Sitesi"), ${COMPANY.nameTr} (Şirket Kimlik No ${COMPANY.id}) ("Şirket", "biz") tarafından işletilmektedir.

Bu sayfa, web sitemizin kullanıcılarının kişisel verilerini nasıl topladığımızı, işlediğimizi ve kullandığımızı açıklamaktadır.

Sağladığınız kişisel verileri hizmetlerimizi ve web sitemizi geliştirmek için kullanıyoruz. Web Sitesini kullanarak, kişisel verilerinizin yürürlükteki mevzuata uygun olarak ve bu Gizlilik Politikasında belirtilen amaçlar doğrultusunda işlenmesini kabul etmiş olursunuz.`,
      },
      {
        title: "Hangi verileri topluyoruz",
        body: `Ad, soyad, e-posta, adres, telefon numarası gibi kişisel kimlik bilgilerini içeren verileri topluyoruz.

Çerez (cookie) saklamıyor veya kullanmıyoruz.`,
      },
      {
        title: "Verilerinizi nasıl topluyoruz",
        body: `Bilgilerin büyük bölümü doğrudan sizin tarafınızdan sağlanır. Verilerinizi şu durumlarda topluyor ve işliyoruz:

• web sitemize kayıt olduğunuzda veya ürün ya da hizmet siparişi verdiğinizde;
• gönüllü olarak bir müşteri anketini doldurduğunuzda veya e-posta ya da başka bir yolla bizimle iletişime geçtiğinizde.

Yukarıdaki liste sınırlayıcı değildir; etkileşimlerimiz sırasında kişisel veriler dolaylı yollardan da toplanabilir.`,
      },
      {
        title: "Verilerinizi nasıl kullanıyoruz",
        body: `Verilerinizi şu amaçlarla topluyoruz:

• siparişinizi işlemek, hesabınızı yönetmek ve ürünleri teslim etmek;
• hizmetlerimiz ve ürünlerimiz hakkında size e-posta yoluyla özel teklifler göndermek;
• web sitesini yönetmek ve geliştirmek.`,
      },
      {
        title: "Verilerinizi nasıl saklıyoruz",
        body: `Kişisel verileri yetkisiz erişim, kullanım, kayıp veya imhaya karşı korumak için makul teknik ve organizasyonel güvenlik önlemleri uyguluyoruz.

Veriler, belirtilen amaçların gerçekleştirilmesi için gerekli olduğu sürece yürürlükteki mevzuata uygun olarak saklanır. Amaçlar ortadan kalktıktan sonra kişisel verilerinizi sileriz veya imha ederiz. Gizli bilgiler, hizmetin tamamlanmasından itibaren 1 yıl süreyle saklanır.`,
      },
      {
        title: "İşleme amacı",
        body: `Cheaper.ge'ye kayıt olarak ve/veya sipariş vererek, kullanıcı kişisel verilerinin aşağıdaki amaçlarla işlenmesini kabul eder:

• hizmet kalitesinin iyileştirilmesi;
• Cheaper.ge'nin yasal yükümlülüklerinin yerine getirilmesi;
• kullanıcı şikayetlerinin çözümlenmesi;
• web sitesindeki kullanıcı etkinliğinin izlenmesi;
• kullanıcılara güncellemeler hakkında bilgi verilmesi;
• etkili iletişim ve geri bildirim;
• haber ve teklifler için kullanıcı gruplarının belirlenmesi;
• pazarlama ve diğer faaliyetler;
• satın alınan ürünler hakkında bilgi sağlanması;
• sistemin yasa dışı kullanımının önlenmesi;
• sözleşmeden doğan yükümlülüklerin yerine getirilmesi;
• Gürcistan mevzuatı uyarınca diğer meşru amaçlar.`,
      },
      {
        title: "Haklarınız",
        body: `Web sitesinin her kullanıcısı, ücretsiz olarak aşağıdaki bilgileri alma hakkına sahiptir:

• verilerinin işlenip işlenmediği ve hangi gerekçeyle işlendiği;
• işlenen veriler, amacı ve hukuki dayanağı;
• verilerin toplanma kaynağı ve saklama süresi;
• verilerin alıcıları.

Ayrıca şu haklara sahipsiniz:
• verilerinize erişme ve kopyalarını alma;
• düzeltme, tamamlama, engelleme, kısıtlama, silme veya imha talep etme;
• işlemenin kısıtlanmasını talep etme;
• herhangi bir zamanda açıklama yapmaksızın rızanızı geri çekme;
• Tiflis Şehir Mahkemesi'ne (David Aghmashenebeli Bulvarı No. 64, Tiflis) şikayette bulunma.

Talebinize 10 gün içinde yanıt vermekle yükümlüyüz.`,
      },
      {
        title: "Pazarlama amaçlı işleme",
        body: `Cheaper.ge'ye kayıt olarak ve/veya hizmetlerini kullanarak, verilerinizin doğrudan pazarlama amacıyla işlenmesine rıza göstermiş olursunuz.

Rızanızı istediğiniz zaman geri çekebilirsiniz. Talebinizi aldıktan sonra pazarlama amaçlı işlemeyi en geç 7 iş günü içinde durduracağız.`,
      },
      {
        title: "Değişiklikler",
        body: `Bu Gizlilik Politikasını yürürlükteki mevzuat ve en iyi uygulamalarla sürekli olarak uyumlu hale getiriyoruz; güncellemeler web sitesine yansıtılır.`,
      },
      {
        title: "Bize nasıl ulaşabilirsiniz",
        body: `Bu Gizlilik Politikası hakkında sorularınız varsa veya haklarınızı kullanmak istiyorsanız, lütfen bizimle iletişime geçin:

E-posta: ${COMPANY.email}
Telefon: ${COMPANY.phone}
Adres: ${COMPANY.addressTr}`,
      },
      {
        title: "Denetim makamıyla iletişim",
        body: `Verilerinizin işlenmesi sırasında haklarınızın ihlal edildiğini düşünüyorsanız, Devlet Müfettişliği Servisi ile iletişime geçin:

Telefon: (+995 32) 242 1000
E-posta: office@stateinspector.ge
Adres: N. Vachnadze Cad. 7, Tiflis 0105, Gürcistan`,
      },
    ],
  },
  fa: {
    title: "سیاست حفظ حریم خصوصی",
    subtitle: `${COMPANY.nameFa} · cheaper.ge`,
    back: "بازگشت",
    sections: [
      {
        title: "مقدمه",
        body: `این وب‌سایت cheaper.ge («وب‌سایت») متعلق به ${COMPANY.nameFa} (شناسه شرکت ${COMPANY.id}) («شرکت»، «ما») است.

این صفحه توضیح می‌دهد که چگونه اطلاعات شخصی کاربران وب‌سایت خود را جمع‌آوری، پردازش و استفاده می‌کنیم.

ما از اطلاعات شخصی‌ای که ارائه می‌دهید برای بهبود خدمات و وب‌سایت خود استفاده می‌کنیم. با استفاده از وب‌سایت، شما موافقت می‌کنید که اطلاعات شخصی شما مطابق قوانین قابل اجرا و برای اهدافی که در این سیاست حفظ حریم خصوصی توضیح داده شده است، پردازش شود.`,
      },
      {
        title: "چه اطلاعاتی جمع‌آوری می‌کنیم",
        body: `ما اطلاعاتی از جمله اطلاعات هویتی شخصی شامل نام، نام خانوادگی، ایمیل، آدرس و شماره تلفن جمع‌آوری می‌کنیم.

ما کوکی ذخیره یا استفاده نمی‌کنیم.`,
      },
      {
        title: "چگونه اطلاعات شما را جمع‌آوری می‌کنیم",
        body: `بیشتر اطلاعات مستقیماً توسط شما ارائه می‌شود. ما اطلاعات را در موارد زیر جمع‌آوری و پردازش می‌کنیم:

• زمانی که در وب‌سایت ما ثبت‌نام می‌کنید یا سفارش محصولات و خدمات را ثبت می‌کنید؛
• زمانی که به‌صورت داوطلبانه یک نظرسنجی مشتری را تکمیل می‌کنید یا از طریق ایمیل یا روش‌های دیگر با ما تماس می‌گیرید.

فهرست بالا جامع نیست؛ اطلاعات شخصی ممکن است به‌صورت غیرمستقیم نیز در طول تعاملات ما جمع‌آوری شود.`,
      },
      {
        title: "چگونه از اطلاعات شما استفاده می‌کنیم",
        body: `ما اطلاعات شما را برای موارد زیر جمع‌آوری می‌کنیم:

• پردازش سفارش شما، مدیریت حساب کاربری‌تان و تحویل محصولات؛
• ارسال پیشنهادهای ویژه درباره خدمات و محصولات ما از طریق ایمیل؛
• مدیریت و بهبود وب‌سایت.`,
      },
      {
        title: "چگونه اطلاعات شما را نگهداری می‌کنیم",
        body: `ما از تدابیر امنیتی فنی و سازمانی معقول برای محافظت از اطلاعات شخصی در برابر دسترسی غیرمجاز، استفاده، از دست دادن یا تخریب استفاده می‌کنیم.

اطلاعات مطابق قوانین قابل اجرا و تا زمانی که برای اهداف ذکرشده لازم باشد نگهداری می‌شود. پس از پایان اهداف، اطلاعات شخصی شما را حذف یا نابود می‌کنیم. اطلاعات محرمانه به مدت ۱ سال پس از پایان خدمات نگهداری می‌شود.`,
      },
      {
        title: "هدف پردازش",
        body: `با ثبت‌نام در Cheaper.ge و/یا ثبت سفارش، کاربر با پردازش اطلاعات شخصی خود برای اهداف زیر موافقت می‌کند:

• بهبود کیفیت خدمات؛
• انجام تعهدات قانونی Cheaper.ge؛
• رسیدگی به شکایات کاربران؛
• نظارت بر فعالیت کاربر در وب‌سایت؛
• اطلاع‌رسانی به کاربران درباره به‌روزرسانی‌ها؛
• ارتباط مؤثر و بازخورد؛
• شناسایی گروه‌های کاربری برای اخبار و پیشنهادها؛
• فعالیت‌های بازاریابی و سایر فعالیت‌ها؛
• ارائه اطلاعات درباره محصولات خریداری‌شده؛
• جلوگیری از استفاده غیرقانونی از سیستم؛
• انجام تعهدات قراردادی؛
• سایر اهداف مشروع طبق قوانین گرجستان.`,
      },
      {
        title: "حقوق شما",
        body: `هر کاربر وب‌سایت حق دارد به‌صورت رایگان اطلاعات زیر را دریافت کند:

• اینکه آیا اطلاعات او پردازش می‌شود یا خیر و بر چه اساسی؛
• اطلاعات پردازش‌شده، هدف و مبنای قانونی آن؛
• منبع جمع‌آوری و مدت نگهداری اطلاعات؛
• گیرندگان اطلاعات.

همچنین شما حق دارید:
• به اطلاعات خود دسترسی داشته باشید و نسخه‌ای از آن دریافت کنید؛
• درخواست اصلاح، تکمیل، مسدودسازی، محدودسازی، حذف یا نابودی کنید؛
• درخواست محدودسازی پردازش کنید؛
• رضایت خود را در هر زمان بدون توضیح پس بگیرید؛
• به دادگاه شهری تفلیس (خیابان داوید آغماشنبلی، پلاک ۶۴، تفلیس) شکایت کنید.

ما موظفیم ظرف ۱۰ روز به درخواست شما پاسخ دهیم.`,
      },
      {
        title: "پردازش برای اهداف بازاریابی",
        body: `با ثبت‌نام و/یا استفاده از خدمات Cheaper.ge، شما با پردازش اطلاعات خود برای اهداف بازاریابی مستقیم موافقت می‌کنید.

شما می‌توانید رضایت خود را در هر زمان پس بگیرید. ما ظرف حداکثر ۷ روز کاری پس از دریافت درخواست شما، پردازش برای اهداف بازاریابی را متوقف خواهیم کرد.`,
      },
      {
        title: "تغییرات",
        body: `ما به‌طور مداوم این سیاست حفظ حریم خصوصی را با قوانین قابل اجرا و بهترین شیوه‌ها هماهنگ می‌کنیم؛ به‌روزرسانی‌ها در وب‌سایت منعکس می‌شود.`,
      },
      {
        title: "چگونه با ما تماس بگیرید",
        body: `اگر سؤالی درباره این سیاست حفظ حریم خصوصی دارید یا می‌خواهید از حقوق خود استفاده کنید، لطفاً با ما تماس بگیرید:

ایمیل: ${COMPANY.email}
تلفن: ${COMPANY.phone}
آدرس: ${COMPANY.addressFa}`,
      },
      {
        title: "تماس با مرجع نظارتی",
        body: `اگر معتقدید حقوق شما در جریان پردازش اطلاعاتتان نقض شده است، با سرویس بازرس دولتی تماس بگیرید:

تلفن: (+995 32) 242 1000
ایمیل: office@stateinspector.ge
آدرس: خیابان ن. واچنادزه، پلاک ۷، تفلیس ۰۱۰۵، گرجستان`,
      },
    ],
  },
  ru: {
    title: "Политика конфиденциальности",
    subtitle: `${COMPANY.nameRu} · cheaper.ge`,
    back: "Назад",
    sections: [
      {
        title: "Введение",
        body: `Настоящий сайт cheaper.ge (далее — «Сайт») принадлежит ${COMPANY.nameRu} (идентификационный код ${COMPANY.id}) (далее — «мы»).

На этой странице описано, как мы собираем, обрабатываем и используем персональные данные пользователей нашего сайта.

Предоставленные вами персональные данные мы используем для улучшения нашего сервиса и сайта. Используя сайт, вы соглашаетесь на обработку персональных данных в соответствии с законодательством и целями, указанными в настоящей политике.`,
      },
      {
        title: "Какие данные мы собираем",
        body: `Мы собираем данные, включающие персональную идентификационную информацию: имя, фамилию, электронную почту, адрес, номер телефона.

Мы не храним и не используем cookie-файлы.`,
      },
      {
        title: "Как мы собираем ваши данные",
        body: `Большую часть информации вы предоставляете нам напрямую. Мы собираем и обрабатываем данные, когда вы:

• регистрируетесь на сайте или оформляете заказ на размещённые у нас товары и услуги;
• добровольно заполняете опрос или связываетесь с нами по электронной почте или другим способом.

Приведённый список не является исчерпывающим — данные могут собираться и из других непрямых источников в процессе нашего взаимодействия.`,
      },
      {
        title: "Как мы используем ваши данные",
        body: `Мы собираем ваши данные, чтобы:

• обрабатывать заказы, управлять вашей учётной записью и доставлять товары;
• отправлять вам специальные предложения о наших услугах и продуктах по электронной почте;
• осуществлять техническое администрирование и развитие сайта.`,
      },
      {
        title: "Как мы храним ваши данные",
        body: `Мы применяем доступные технические и организационные меры безопасности для защиты персональных данных от несанкционированного доступа, использования, потери или уничтожения.

Данные хранятся в соответствии с действующим законодательством в течение необходимого срока. По истечении целей обработки мы удаляем/уничтожаем ваши персональные данные. Конфиденциальная информация хранится в течение 1 года после завершения обслуживания.`,
      },
      {
        title: "Цели обработки данных",
        body: `Регистрируясь на Cheaper.ge и/или оформляя заказ, пользователь соглашается на использование своих персональных данных в следующих целях:

• улучшение качества обслуживания;
• исполнение установленных законом обязательств Cheaper.ge;
• рассмотрение претензий пользователей;
• мониторинг активности на сайте;
• уведомление об обновлениях;
• эффективная коммуникация и обратная связь;
• определение целевых групп для новостей и предложений;
• маркетинговая и иная деятельность;
• предоставление информации о приобретённой продукции;
• предотвращение неправомерного использования системы;
• исполнение договорных обязательств;
• иные законные цели в соответствии с законодательством Грузии.`,
      },
      {
        title: "Ваши права",
        body: `Каждый пользователь сайта имеет право бесплатно получить информацию:

• обрабатываются ли его данные и на каком основании;
• о данных, обрабатываемых о нём, цели и основании обработки;
• об источнике сбора и сроке хранения данных;
• о получателях данных.

Также вы имеете право:
• получить доступ к своим данным и их копии;
• требовать исправления, дополнения, блокировки, ограничения, удаления или уничтожения;
• требовать ограничения обработки;
• отозвать согласие в любое время без объяснения причин;
• обжаловать — обратиться в Тбилисский городской суд (просп. Давида Агмашенебели 64, Тбилиси).

Мы обязаны ответить на ваш запрос в течение 10 дней.`,
      },
      {
        title: "Обработка в маркетинговых целях",
        body: `Регистрируясь и/или пользуясь услугами Cheaper.ge, вы соглашаетесь на обработку ваших данных в целях прямого маркетинга.

Вы можете отозвать согласие в любое время. Мы прекратим обработку в целях маркетинга не позднее 7 рабочих дней с момента получения запроса.`,
      },
      {
        title: "Изменения",
        body: `Мы постоянно приводим политику конфиденциальности в соответствие с действующим законодательством и принципами; соответствующие обновления отражаются на сайте.`,
      },
      {
        title: "Как с нами связаться",
        body: `Если у вас есть вопросы по политике конфиденциальности или вы хотите воспользоваться своими правами, свяжитесь с нами:

Эл. почта: ${COMPANY.email}
Телефон: ${COMPANY.phone}
Адрес: ${COMPANY.addressRu}`,
      },
      {
        title: "Обращение в уполномоченные органы",
        body: `Если вы считаете, что при обработке ваших данных были нарушены ваши права, обратитесь в Службу государственного инспектора:

Телефон: (+995 32) 242 1000
Эл. почта: office@stateinspector.ge
Адрес: ул. Н. Вачнадзе 7, Тбилиси 0105, Грузия`,
      },
    ],
  },
};

// ================= TERMS =================
export const TERMS: Record<Language, LegalDoc> = {
  ka: {
    title: "წესები და პირობები",
    subtitle: `${COMPANY.nameKa} · Cheaper.ge`,
    back: "უკან",
    sections: [
      {
        title: "შესავალი",
        body: `წინამდებარე დოკუმენტში წარმოდგენილია Cheaper.ge-ს ვებგვერდით სარგებლობის წესები და პირობები.

დოკუმენტი შედგენილია ${COMPANY.nameKa}-ს მიერ (ს/კ ${COMPANY.id}), მისამართი: ${COMPANY.addressKa}, ტელეფონი: ${COMPANY.phone}.

${COMPANY.nameKa} შემდგომში მოხსენიებული იქნება, როგორც „Cheaper.ge".`,
      },
      {
        title: "რეგისტრაცია",
        body: `Cheaper.ge-ზე პროდუქციის შესაძენად საჭიროა ვებგვერდზე რეგისტრაცია, რისთვისაც აუცილებელია სარეგისტრაციო ფორმის შევსება შემდეგი მონაცემების მითითებით:

• სახელი
• მიწოდების მისამართი
• ტელეფონის ნომერი
• ელექტრონული ფოსტა

სისტემაში შესვლა/ავტორიზაცია ასევე შესაძლებელია:

• სოციალური ქსელით
• Google-ით`,
      },
      {
        title: "პროდუქციის შეძენა და თანხის დაბრუნება",
        body: `პროდუქტის შერჩევისა და კალათაში მოთავსების შემდგომ მომხმარებელი პროდუქციის საფასურის გადახდის მიზნით გადამისამართდება ანგარიშსწორების გვერდზე. ანგარიშსწორებამდე მომხმარებელი ვალდებულია გადაამოწმოს მითითებული მისამართი და საკონტაქტო ინფორმაცია შეძენილი პროდუქციის შეუფერხებლად მიწოდების უზრუნველყოფის მიზნით.

პროდუქტის საფასურის გადახდის შემდგომ შეძენილ ნივთზე საკუთრების უფლება სრულად გადადის მომხმარებელზე.

წუნის არსებობის შემთხვევაში, თუ მომხმარებელი მითითებულ საკონტაქტო მეილზე ან ნომერზე გადმოგზავნის წუნის დამადასტურებელ ფოტოებს, Cheaper.ge ვალდებულია, დადასტურების შემდეგ, 3 სამუშაო დღის განმავლობაში ინიციირება გაუკეთოს თანხის დაბრუნებას გადამხდელი ბანკის მეშვეობით. თანხის ფაქტობრივი ჩარიცხვის ვადა შეიძლება განსხვავდებოდეს მომხმარებლის ბანკის შიდა რეგლამენტის მიხედვით (ჩვეულებრივ, დამატებით 3–10 სამუშაო დღემდე).`,
      },
      {
        title: "პროდუქციის მიწოდება",
        body: `შეძენილი პროდუქცია მომხმარებელს მიეწოდება წინასწარ საფოსტო ან კურიერული მომსახურებით, ან მომხმარებელს შეუძლია მითითებულ მისამართზე თვითონ მივიდეს.

პროდუქციის მიწოდება ხდება მხოლოდ საქართველოს მასშტაბით.

პროდუქციის გატანის დღეები და საათები მომხმარებელს ეცნობება პროდუქციის ყიდვის მომენტში.`,
      },
      {
        title: "ანგარიშსწორების წესი",
        body: `შეძენისას თანხის გადახდა შესაძლებელია მხოლოდ უნაღდო ანგარიშსწორების გზით.

შეკვეთის გაფორმებისას მომხმარებელი ვებგვერდიდან გადამისამართდება ანგარიშსწორების გვერდზე, სადაც მიუთითებს საკუთარი ბარათის მონაცემებს. ანგარიშსწორების მოთხოვნა მუშავდება და დასტურდება ბანკის მიერ.

Cheaper.ge-ს არ აქვს წვდომა არც ანგარიშსწორების გვერდზე და არც მომხმარებლის მიერ მითითებულ საბანკო ბარათის მონაცემებზე.

თანხის დაბრუნება ხდება მომხმარებლის მიერ მოწოდებულ ანგარიშზე.`,
      },
      {
        title: "პლატფორმის მუშაობის პრინციპები",
        body: `Cheaper წარმოადგენს ციფრულ Marketplace პლატფორმას, რომელიც აკავშირებს მომხმარებლებსა და პარტნიორ ობიექტებს, მათ შორის რესტორნებს, კაფეებს, საცხობებს, სუპერმარკეტებსა და სხვა სავაჭრო ობიექტებს. პლატფორმის მიზანია მომხმარებლებს მიაწოდოს ინფორმაცია სპეციალური შეთავაზებებისა და ხელმისაწვდომი პროდუქტების შესახებ, ხოლო პარტნიორ ბიზნესებს მისცეს შესაძლებლობა გაზარდონ გაყიდვები და ეფექტურად მართონ საკუთარი შეთავაზებები.

Cheaper არ არის პროდუქციის გამყიდველი. პლატფორმა წარმოადგენს ტექნოლოგიურ შუამავალს, რომელიც უზრუნველყოფს მომხმარებლისა და პარტნიორი ობიექტის დაკავშირებას, შეკვეთების დამუშავების პროცესის გამარტივებას და შესაბამისი ინფორმაციის უსაფრთხო გაცვლას.`,
      },
      {
        title: "პარტნიორ ობიექტებთან თანამშრომლობის მოდელი",
        body: `Cheaper თანამშრომლობს მხოლოდ იმ პარტნიორ ობიექტებთან, რომლებიც მოქმედებენ საქართველოს კანონმდებლობის შესაბამისად და თავად არიან პასუხისმგებელნი მათ მიერ განთავსებული პროდუქციის, მომსახურების, ფასების, აღწერისა და ხარისხის სისწორეზე.

პარტნიორი ობიექტი დამოუკიდებლად:

• ქმნის და მართავს შეთავაზებებს;
• განსაზღვრავს ფასებსა და მოქმედების პერიოდს;
• არეგულირებს პროდუქციის მარაგს;
• პასუხისმგებელია შეკვეთის შესრულებაზე;
• უზრუნველყოფს მომხმარებლისთვის პროდუქციის ან მომსახურების მიწოდებას ან გაცემას.

Cheaper უფლებამოსილია წაშალოს ან შეაჩეროს ნებისმიერი შეთავაზება, რომელიც არღვევს პლატფორმის წესებს, მოქმედ კანონმდებლობას ან მომხმარებლის უფლებებს.`,
      },
      {
        title: "მომხმარებლისთვის ინფორმაციის მიწოდების წესები",
        body: `Cheaper მომხმარებლებს აწვდის ინფორმაციას პარტნიორი ობიექტების მიერ წარმოდგენილი მონაცემების საფუძველზე.

პლატფორმაზე განთავსებული ინფორმაცია შეიძლება მოიცავდეს:

• პროდუქტის ან მომსახურების აღწერას;
• ფასს და ფასდაკლებას;
• შეთავაზების მოქმედების პერიოდს;
• ხელმისაწვდომ რაოდენობას (არსებობის შემთხვევაში);
• პარტნიორი ობიექტის მისამართსა და სამუშაო საათებს;
• პროდუქტის მიღების ან მიწოდების პირობებს;
• სხვა დამატებით ინფორმაციას, რომელიც მნიშვნელოვანია მომხმარებლისთვის.

Cheaper უზრუნველყოფს ინფორმაციის მაქსიმალურად ზუსტ და დროულ ასახვას, თუმცა კონკრეტული ინფორმაციის სისწორეზე, მარაგის ხელმისაწვდომობასა და შეთავაზების შესრულებაზე პასუხისმგებელია შესაბამისი პარტნიორი ობიექტი.

თუ მომხმარებელი აღმოაჩენს არასწორ, არასრულ ან შეცდომაში შემყვან ინფორმაციას, მას შეუძლია აცნობოს Cheaper-ს შესაბამისი საკომუნიკაციო არხების მეშვეობით. მიღებული შეტყობინება განიხილება გონივრულ ვადაში და საჭიროების შემთხვევაში განხორციელდება შესაბამისი რეაგირება.`,
      },
      {
        title: "პლატფორმის ძირითადი პრინციპები",
        body: `Cheaper საქმიანობას ეფუძნება შემდეგ პრინციპებს:

• მომხმარებლისთვის სანდო და გამჭვირვალე ინფორმაციის მიწოდება;
• პარტნიორ ბიზნესებთან სამართლიანი და გრძელვადიანი თანამშრომლობა;
• პერსონალური მონაცემების დაცვა;
• უსაფრთხო ციფრული გარემოს უზრუნველყოფა;
• მომსახურების უწყვეტი გაუმჯობესება;
• მოქმედი კანონმდებლობის მოთხოვნების დაცვა;
• მომხმარებელზე ორიენტირებული და ტექნოლოგიურად განვითარებული მომსახურების შეთავაზება.`,
      },
      {
        title: "საკონტაქტო ინფორმაცია",
        body: `${COMPANY.nameKa}
საიდენტიფიკაციო კოდი: ${COMPANY.id}
მისამართი: ${COMPANY.addressKa}
ტელეფონი: ${COMPANY.phone}
ელფოსტა: ${COMPANY.email}`,
      },
    ],
  },
  en: {
    title: "Terms & Conditions",
    subtitle: `${COMPANY.nameEn} · Cheaper.ge`,
    back: "Back",
    sections: [
      {
        title: "Introduction",
        body: `This document sets out the terms and conditions for using the Cheaper.ge website.

The document is issued by ${COMPANY.nameEn} (Company ID ${COMPANY.id}), address: ${COMPANY.addressEn}, phone: ${COMPANY.phone}.

${COMPANY.nameEn} is referred to hereafter as "Cheaper.ge".`,
      },
      {
        title: "Registration",
        body: `To purchase products on Cheaper.ge, registration is required. You must fill out the registration form with:

• Name
• Delivery address
• Phone number
• Email

You can also sign in with:

• A social network account
• Google`,
      },
      {
        title: "Purchase and refunds",
        body: `After selecting a product and adding it to the cart, the user is redirected to the payment page. Before payment, the user must verify the address and contact information provided in order to ensure smooth delivery.

After payment, full ownership of the purchased item passes to the user.

If the delivered product is defective, and the user sends photo evidence to the specified email or phone, Cheaper.ge is obliged to refund the price of the product.`,
      },
      {
        title: "Delivery",
        body: `Purchased products are delivered by postal or courier service, or the user may pick up the order in person at the specified address.

Delivery is available only within Georgia.

The pick-up days and times are communicated to the user at the moment of purchase.`,
      },
      {
        title: "Payment",
        body: `Payment is available only by cashless methods.

When placing an order, the user is redirected from the website to the payment page, where they enter their card details. The payment request is processed and confirmed by the bank.

Cheaper.ge does not have access to the payment page or to the user's bank card details.

Refunds are made to the account provided by the user.`,
      },
      {
        title: "How the platform works",
        body: `Cheaper is a digital marketplace platform connecting customers with partner venues, including restaurants, cafés, bakeries, supermarkets and other retail outlets. The platform's purpose is to give customers information about special offers and available products, and to let partner businesses increase sales and manage their offers efficiently.

Cheaper is not the seller of the products. The platform is a technological intermediary that connects the customer and the partner venue, simplifies order processing and ensures the secure exchange of relevant information.`,
      },
      {
        title: "Cooperation model with partner venues",
        body: `Cheaper works only with partner venues that operate in accordance with Georgian legislation and that are themselves responsible for the accuracy of the products, services, prices, descriptions and quality they publish.

The partner venue independently:

• creates and manages offers;
• sets prices and validity periods;
• manages product stock;
• is responsible for fulfilling the order;
• delivers or hands over the product or service to the customer.

Cheaper is entitled to remove or suspend any offer that violates the platform's rules, applicable law or customer rights.`,
      },
      {
        title: "Rules for providing information to customers",
        body: `Cheaper provides customers with information based on the data submitted by partner venues.

Information published on the platform may include:

• a description of the product or service;
• price and discount;
• the validity period of the offer;
• available quantity (where applicable);
• the partner venue's address and working hours;
• pickup or delivery conditions;
• other additional information relevant to the customer.

Cheaper ensures information is reflected as accurately and promptly as possible; however, the relevant partner venue is responsible for the accuracy of specific information, stock availability and fulfilment of the offer.

If a customer finds incorrect, incomplete or misleading information, they may notify Cheaper through the available communication channels. Such notice is reviewed within a reasonable time and acted upon where necessary.`,
      },
      {
        title: "Core principles of the platform",
        body: `Cheaper's activity is based on the following principles:

• providing customers with reliable and transparent information;
• fair and long-term cooperation with partner businesses;
• protection of personal data;
• ensuring a secure digital environment;
• continuous improvement of the service;
• compliance with applicable legislation;
• offering customer-oriented and technologically advanced service.`,
      },
      {
        title: "Contact information",
        body: `${COMPANY.nameEn}
Company ID: ${COMPANY.id}
Address: ${COMPANY.addressEn}
Phone: ${COMPANY.phone}
Email: ${COMPANY.email}`,
      },
    ],
  },
  tr: {
    title: "Şartlar ve Koşullar",
    subtitle: `${COMPANY.nameTr} · Cheaper.ge`,
    back: "Geri",
    sections: [
      {
        title: "Giriş",
        body: `Bu belge, Cheaper.ge web sitesinin kullanımına ilişkin şartları ve koşulları belirler.

Bu belge ${COMPANY.nameTr} (Şirket Kimlik No ${COMPANY.id}) tarafından hazırlanmıştır, adres: ${COMPANY.addressTr}, telefon: ${COMPANY.phone}.

${COMPANY.nameTr}, bundan sonra "Cheaper.ge" olarak anılacaktır.`,
      },
      {
        title: "Kayıt",
        body: `Cheaper.ge üzerinden ürün satın almak için kayıt olmanız gerekir. Aşağıdaki bilgilerle kayıt formunu doldurmanız gerekmektedir:

• Ad
• Teslimat adresi
• Telefon numarası
• E-posta

Ayrıca şu şekilde de giriş yapabilirsiniz:

• Bir sosyal medya hesabı
• Google`,
      },
      {
        title: "Satın alma ve iade",
        body: `Bir ürün seçip sepete ekledikten sonra kullanıcı ödeme sayfasına yönlendirilir. Ödemeden önce kullanıcı, sorunsuz teslimat sağlanabilmesi için verilen adresi ve iletişim bilgilerini doğrulamalıdır.

Ödeme sonrasında satın alınan ürünün mülkiyeti tamamen kullanıcıya geçer.

Teslim edilen ürün kusurlu ise ve kullanıcı belirtilen e-posta veya telefona fotoğraf kanıtı gönderirse, Cheaper.ge ürünün bedelini iade etmekle yükümlüdür.`,
      },
      {
        title: "Teslimat",
        body: `Satın alınan ürünler posta veya kurye hizmetiyle teslim edilir ya da kullanıcı belirtilen adresten siparişi bizzat teslim alabilir.

Teslimat yalnızca Gürcistan sınırları içinde yapılır.

Teslim alma günleri ve saatleri, satın alma anında kullanıcıya bildirilir.`,
      },
      {
        title: "Ödeme",
        body: `Ödeme yalnızca nakit dışı yöntemlerle yapılabilir.

Sipariş verirken kullanıcı web sitesinden ödeme sayfasına yönlendirilir ve kart bilgilerini girer. Ödeme talebi banka tarafından işlenir ve onaylanır.

Cheaper.ge'nin ödeme sayfasına veya kullanıcının banka kartı bilgilerine erişimi yoktur.

İadeler, kullanıcı tarafından belirtilen hesaba yapılır.`,
      },
      {
        title: "Platformun çalışma prensipleri",
        body: `Cheaper; müşterileri restoranlar, kafeler, fırınlar, süpermarketler ve diğer satış noktaları dahil olmak üzere partner işletmelerle buluşturan dijital bir pazar yeri platformudur. Platformun amacı, müşterilere özel teklifler ve mevcut ürünler hakkında bilgi sunmak, partner işletmelere ise satışlarını artırma ve tekliflerini verimli yönetme imkânı vermektir.

Cheaper ürünlerin satıcısı değildir. Platform, müşteri ile partner işletmeyi birbirine bağlayan, sipariş sürecini kolaylaştıran ve ilgili bilgilerin güvenli paylaşımını sağlayan teknolojik bir aracıdır.`,
      },
      {
        title: "Partner işletmelerle iş birliği modeli",
        body: `Cheaper yalnızca Gürcistan mevzuatına uygun faaliyet gösteren ve yayınladıkları ürün, hizmet, fiyat, açıklama ve kalitenin doğruluğundan bizzat sorumlu olan partner işletmelerle çalışır.

Partner işletme bağımsız olarak:

• teklifleri oluşturur ve yönetir;
• fiyatları ve geçerlilik süresini belirler;
• ürün stoğunu düzenler;
• siparişin yerine getirilmesinden sorumludur;
• ürün veya hizmeti müşteriye teslim eder.

Cheaper, platform kurallarını, yürürlükteki mevzuatı veya müşteri haklarını ihlal eden her teklifi kaldırma veya askıya alma hakkına sahiptir.`,
      },
      {
        title: "Müşterilere bilgi sunma kuralları",
        body: `Cheaper, müşterilere partner işletmeler tarafından sunulan verilere dayanarak bilgi verir.

Platformda yayınlanan bilgiler şunları içerebilir:

• ürün veya hizmetin açıklaması;
• fiyat ve indirim;
• teklifin geçerlilik süresi;
• mevcut miktar (varsa);
• partner işletmenin adresi ve çalışma saatleri;
• teslim alma veya teslimat koşulları;
• müşteri için önemli olan diğer ek bilgiler.

Cheaper bilgilerin mümkün olduğunca doğru ve zamanında yansıtılmasını sağlar; ancak belirli bilgilerin doğruluğundan, stok durumundan ve teklifin yerine getirilmesinden ilgili partner işletme sorumludur.

Müşteri yanlış, eksik veya yanıltıcı bilgi tespit ederse, ilgili iletişim kanalları aracılığıyla Cheaper'a bildirebilir. Bildirim makul bir süre içinde incelenir ve gerektiğinde gerekli işlem yapılır.`,
      },
      {
        title: "Platformun temel ilkeleri",
        body: `Cheaper faaliyetlerini şu ilkelere dayandırır:

• müşteriye güvenilir ve şeffaf bilgi sunmak;
• partner işletmelerle adil ve uzun vadeli iş birliği;
• kişisel verilerin korunması;
• güvenli bir dijital ortam sağlamak;
• hizmetin sürekli iyileştirilmesi;
• yürürlükteki mevzuata uyum;
• müşteri odaklı ve teknolojik olarak gelişmiş hizmet sunmak.`,
      },
      {
        title: "İletişim bilgileri",
        body: `${COMPANY.nameTr}
Şirket Kimlik No: ${COMPANY.id}
Adres: ${COMPANY.addressTr}
Telefon: ${COMPANY.phone}
E-posta: ${COMPANY.email}`,
      },
    ],
  },
  fa: {
    title: "قوانین و مقررات",
    subtitle: `${COMPANY.nameFa} · Cheaper.ge`,
    back: "بازگشت",
    sections: [
      {
        title: "مقدمه",
        body: `این سند شرایط و ضوابط استفاده از وب‌سایت Cheaper.ge را بیان می‌کند.

این سند توسط ${COMPANY.nameFa} (شناسه شرکت ${COMPANY.id}) تهیه شده است، آدرس: ${COMPANY.addressFa}، تلفن: ${COMPANY.phone}.

${COMPANY.nameFa} از این پس «Cheaper.ge» نامیده می‌شود.`,
      },
      {
        title: "ثبت‌نام",
        body: `برای خرید محصولات از Cheaper.ge، ثبت‌نام لازم است. باید فرم ثبت‌نام را با اطلاعات زیر تکمیل کنید:

• نام
• آدرس تحویل
• شماره تلفن
• ایمیل

همچنین می‌توانید از طریق موارد زیر وارد شوید:

• یک حساب شبکه اجتماعی
• Google`,
      },
      {
        title: "خرید و بازپرداخت",
        body: `پس از انتخاب یک محصول و افزودن آن به سبد خرید، کاربر به صفحه پرداخت هدایت می‌شود. قبل از پرداخت، کاربر باید آدرس و اطلاعات تماس ارائه‌شده را برای اطمینان از تحویل بدون مشکل بررسی کند.

پس از پرداخت، مالکیت کامل کالای خریداری‌شده به کاربر منتقل می‌شود.

اگر محصول تحویل‌داده‌شده معیوب باشد و کاربر مدرک عکسی به ایمیل یا شماره تلفن مشخص‌شده ارسال کند، Cheaper.ge موظف است قیمت محصول را بازپرداخت کند.`,
      },
      {
        title: "تحویل",
        body: `محصولات خریداری‌شده از طریق پست یا سرویس پیک تحویل داده می‌شوند، یا کاربر می‌تواند سفارش را شخصاً از آدرس مشخص‌شده تحویل بگیرد.

تحویل فقط در محدوده گرجستان انجام می‌شود.

روزها و ساعات تحویل در زمان خرید به کاربر اطلاع داده می‌شود.`,
      },
      {
        title: "پرداخت",
        body: `پرداخت فقط از طریق روش‌های غیرنقدی امکان‌پذیر است.

هنگام ثبت سفارش، کاربر از وب‌سایت به صفحه پرداخت هدایت می‌شود و اطلاعات کارت خود را وارد می‌کند. درخواست پرداخت توسط بانک پردازش و تأیید می‌شود.

Cheaper.ge به صفحه پرداخت یا اطلاعات کارت بانکی کاربر دسترسی ندارد.

بازپرداخت‌ها به حسابی که توسط کاربر ارائه شده است، انجام می‌شود.`,
      },
      {
        title: "اصول کار پلتفرم",
        body: `Cheaper یک پلتفرم بازار دیجیتال است که مشتریان را به کسب‌وکارهای شریک، از جمله رستوران‌ها، کافه‌ها، نانوایی‌ها، سوپرمارکت‌ها و دیگر فروشگاه‌ها متصل می‌کند. هدف پلتفرم ارائه اطلاعات درباره پیشنهادهای ویژه و محصولات موجود به مشتریان و فراهم کردن امکان افزایش فروش و مدیریت مؤثر پیشنهادها برای شرکا است.

Cheaper فروشنده محصولات نیست. این پلتفرم یک واسط فناورانه است که ارتباط میان مشتری و کسب‌وکار شریک، ساده‌سازی روند پردازش سفارش و تبادل امن اطلاعات را فراهم می‌کند.`,
      },
      {
        title: "مدل همکاری با کسب‌وکارهای شریک",
        body: `Cheaper تنها با شرکایی همکاری می‌کند که مطابق قوانین گرجستان فعالیت می‌کنند و خود مسئول صحت محصولات، خدمات، قیمت‌ها، توضیحات و کیفیت منتشرشده هستند.

کسب‌وکار شریک به‌طور مستقل:

• پیشنهادها را ایجاد و مدیریت می‌کند؛
• قیمت‌ها و مدت اعتبار را تعیین می‌کند؛
• موجودی کالا را تنظیم می‌کند؛
• مسئول انجام سفارش است؛
• محصول یا خدمت را به مشتری تحویل می‌دهد.

Cheaper مجاز است هر پیشنهادی را که قوانین پلتفرم، قوانین جاری یا حقوق مشتری را نقض کند حذف یا متوقف کند.`,
      },
      {
        title: "قواعد ارائه اطلاعات به مشتریان",
        body: `Cheaper اطلاعات را بر اساس داده‌های ارائه‌شده توسط کسب‌وکارهای شریک در اختیار مشتریان قرار می‌دهد.

اطلاعات منتشرشده در پلتفرم می‌تواند شامل موارد زیر باشد:

• توضیح محصول یا خدمت؛
• قیمت و تخفیف؛
• مدت اعتبار پیشنهاد؛
• تعداد موجود (در صورت وجود)؛
• آدرس و ساعات کاری کسب‌وکار شریک؛
• شرایط دریافت یا تحویل؛
• سایر اطلاعات مهم برای مشتری.

Cheaper تلاش می‌کند اطلاعات تا حد ممکن دقیق و به‌موقع منعکس شود، اما مسئولیت صحت اطلاعات مشخص، موجودی کالا و اجرای پیشنهاد بر عهده کسب‌وکار شریک است.

اگر مشتری اطلاعات نادرست، ناقص یا گمراه‌کننده بیابد، می‌تواند از طریق کانال‌های ارتباطی به Cheaper اطلاع دهد. این اطلاع در زمان معقول بررسی و در صورت نیاز اقدام لازم انجام می‌شود.`,
      },
      {
        title: "اصول اساسی پلتفرم",
        body: `فعالیت Cheaper بر اصول زیر استوار است:

• ارائه اطلاعات قابل اعتماد و شفاف به مشتری؛
• همکاری عادلانه و بلندمدت با کسب‌وکارهای شریک؛
• حفاظت از داده‌های شخصی؛
• تأمین محیط دیجیتال امن؛
• بهبود مستمر خدمات؛
• رعایت الزامات قوانین جاری؛
• ارائه خدمات مشتری‌محور و مبتنی بر فناوری پیشرفته.`,
      },
      {
        title: "اطلاعات تماس",
        body: `${COMPANY.nameFa}
شناسه شرکت: ${COMPANY.id}
آدرس: ${COMPANY.addressFa}
تلفن: ${COMPANY.phone}
ایمیل: ${COMPANY.email}`,
      },
    ],
  },
  ru: {
    title: "Правила и условия",
    subtitle: `${COMPANY.nameRu} · Cheaper.ge`,
    back: "Назад",
    sections: [
      {
        title: "Введение",
        body: `В настоящем документе изложены правила и условия использования сайта Cheaper.ge.

Документ составлен ${COMPANY.nameRu} (идентификационный код ${COMPANY.id}), адрес: ${COMPANY.addressRu}, телефон: ${COMPANY.phone}.

${COMPANY.nameRu} далее именуется «Cheaper.ge».`,
      },
      {
        title: "Регистрация",
        body: `Для покупки товаров на Cheaper.ge необходима регистрация на сайте. Для этого заполняется регистрационная форма со следующими данными:

• Имя
• Адрес доставки
• Номер телефона
• Электронная почта

Также возможен вход/авторизация через:

• Социальную сеть
• Google`,
      },
      {
        title: "Покупка и возврат средств",
        body: `После выбора товара и добавления его в корзину пользователь перенаправляется на страницу оплаты. Перед оплатой пользователь обязан проверить указанный адрес и контактную информацию для обеспечения беспрепятственной доставки.

После оплаты право собственности на приобретённый товар полностью переходит к пользователю.

При наличии дефекта, если пользователь отправит фотоподтверждения на указанный e-mail или номер, Cheaper.ge обязан вернуть пользователю стоимость товара.`,
      },
      {
        title: "Доставка",
        body: `Приобретённая продукция доставляется пользователю почтовой или курьерской службой, либо пользователь может забрать её самостоятельно по указанному адресу.

Доставка осуществляется только в пределах Грузии.

Дни и часы получения продукции сообщаются пользователю в момент покупки.`,
      },
      {
        title: "Порядок расчётов",
        body: `Оплата возможна только безналичным способом.

При оформлении заказа пользователь перенаправляется на страницу оплаты, где указывает данные своей карты. Запрос на оплату обрабатывается и подтверждается банком.

Cheaper.ge не имеет доступа ни к странице оплаты, ни к данным банковской карты пользователя.

Возврат средств производится на счёт, предоставленный пользователем.`,
      },
      {
        title: "Принципы работы платформы",
        body: `Cheaper — это цифровая marketplace-платформа, которая связывает пользователей с партнёрскими объектами: ресторанами, кафе, пекарнями, супермаркетами и другими торговыми объектами. Цель платформы — предоставлять пользователям информацию о специальных предложениях и доступных продуктах, а партнёрам — возможность увеличивать продажи и эффективно управлять своими предложениями.

Cheaper не является продавцом продукции. Платформа выступает технологическим посредником, который обеспечивает связь между пользователем и партнёрским объектом, упрощает обработку заказов и безопасный обмен соответствующей информацией.`,
      },
      {
        title: "Модель сотрудничества с партнёрскими объектами",
        body: `Cheaper сотрудничает только с теми партнёрскими объектами, которые действуют в соответствии с законодательством Грузии и сами несут ответственность за достоверность размещённой продукции, услуг, цен, описаний и качества.

Партнёрский объект самостоятельно:

• создаёт предложения и управляет ими;
• определяет цены и период действия;
• регулирует запасы продукции;
• отвечает за исполнение заказа;
• обеспечивает передачу или доставку продукции либо услуги пользователю.

Cheaper вправе удалить или приостановить любое предложение, нарушающее правила платформы, действующее законодательство или права пользователя.`,
      },
      {
        title: "Правила предоставления информации пользователям",
        body: `Cheaper предоставляет пользователям информацию на основе данных, представленных партнёрскими объектами.

Информация, размещённая на платформе, может включать:

• описание продукта или услуги;
• цену и скидку;
• период действия предложения;
• доступное количество (при наличии);
• адрес и часы работы партнёрского объекта;
• условия получения или доставки;
• иную дополнительную информацию, важную для пользователя.

Cheaper обеспечивает максимально точное и своевременное отражение информации, однако ответственность за достоверность конкретной информации, наличие запасов и исполнение предложения несёт соответствующий партнёрский объект.

Если пользователь обнаружит неверную, неполную или вводящую в заблуждение информацию, он может сообщить об этом Cheaper через соответствующие каналы связи. Полученное сообщение рассматривается в разумный срок, и при необходимости принимаются меры.`,
      },
      {
        title: "Основные принципы платформы",
        body: `Деятельность Cheaper основана на следующих принципах:

• предоставление пользователю достоверной и прозрачной информации;
• справедливое и долгосрочное сотрудничество с партнёрским бизнесом;
• защита персональных данных;
• обеспечение безопасной цифровой среды;
• непрерывное улучшение сервиса;
• соблюдение требований действующего законодательства;
• клиентоориентированный и технологически развитый сервис.`,
      },
      {
        title: "Контактная информация",
        body: `${COMPANY.nameRu}
Идентификационный код: ${COMPANY.id}
Адрес: ${COMPANY.addressRu}
Телефон: ${COMPANY.phone}
Эл. почта: ${COMPANY.email}`,
      },
    ],
  },
};
