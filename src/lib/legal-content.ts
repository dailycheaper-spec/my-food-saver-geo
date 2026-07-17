import type { Language } from "@/lib/i18n";

export const COMPANY = {
  nameKa: "შ.პ.ს. „გეოკუბი“",
  nameEn: "LLC Geokubi",
  nameRu: "ООО «Геокуби»",
  id: "404715947",
  addressKa: "ვასილ ბარნოვის 71, თბილისი, საქართველო, 0179",
  addressEn: "71 Vasil Barnovi Str., Tbilisi, Georgia, 0179",
  addressRu: "ул. Василия Барнови 71, Тбилиси, Грузия, 0179",
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

წუნის არსებობის შემთხვევაში, თუ მომხმარებელი მითითებულ საკონტაქტო მეილზე ან ნომერზე გადმოგზავნის წუნის დამადასტურებელ ფოტოებს, Cheaper.ge ვალდებულია მომხმარებელს უკან დაუბრუნოს პროდუქციის ღირებულება.`,
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
        title: "Contact information",
        body: `${COMPANY.nameEn}
Company ID: ${COMPANY.id}
Address: ${COMPANY.addressEn}
Phone: ${COMPANY.phone}
Email: ${COMPANY.email}`,
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
