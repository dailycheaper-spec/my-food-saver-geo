/**
 * LEGAL SOURCE TEXT — partnership agreement template.
 *
 * ⚠️ IMPORTANT: the wording below is a STRUCTURAL PLACEHOLDER.
 * The authoritative legal text lives in `Cheapers_პარტნიორობის_ხელშეკრულების_ფორმა.docx`.
 * When that document is available, replace every prose paragraph here with its
 * exact wording — do not rewrite, shorten or translate it. Keep the
 * `{{placeholder}}` tokens exactly as they are: they are the only dynamic parts,
 * and `src/lib/contracts.server.ts` fills them from the store record and
 * `platform_settings`.
 *
 * Tokens in use (all are always provided by buildPlaceholderValues):
 *   partner_legal_name, partner_entity_type, partner_identification_code,
 *   partner_legal_address, partner_representative_name, partner_phone,
 *   partner_email, contract_number, contract_date, signing_date, effective_date,
 *   place, commission_percentage, liability_cap_multiplier,
 *   termination_notice_days, cure_period_days, min_discount_pct,
 *   settlement_cycle, settlement_day, min_payout_amount, delivery_fee_payer,
 *   payment_processing_fee, service_start_date, special_conditions
 */
export const PARTNER_AGREEMENT_TEMPLATE_HTML = `
<article class="contract">
  <h1>პარტნიორობის ხელშეკრულება</h1>
  <p class="meta">ხელშეკრულების №: <strong>{{contract_number}}</strong></p>
  <p class="meta">ადგილი: {{place}} &nbsp;|&nbsp; თარიღი: {{contract_date}}</p>

  <h2>1. მხარეები</h2>
  <p>
    1.1. შპს „ჩიფერი“ (Cheaper), შემდგომში — <strong>პლატფორმა</strong>, ერთი მხრივ, და
  </p>
  <p>
    1.2. {{partner_legal_name}} ({{partner_entity_type}}), საიდენტიფიკაციო კოდი
    {{partner_identification_code}}, იურიდიული მისამართი: {{partner_legal_address}},
    წარმომადგენელი: {{partner_representative_name}}, ტელეფონი: {{partner_phone}},
    ელფოსტა: {{partner_email}}, შემდგომში — <strong>პარტნიორი</strong>, მეორე მხრივ.
  </p>

  <h2>2. ხელშეკრულების საგანი</h2>
  <p>
    პლატფორმა უზრუნველყოფს პარტნიორის ფასდაკლებული პროდუქციის განთავსებას და
    რეალიზაციას, პარტნიორი კი — შეთავაზებული პროდუქციის მიწოდებას წინამდებარე
    ხელშეკრულების პირობების შესაბამისად.
  </p>

  <h2>3. ფასდაკლების მინიმალური ზღვარი</h2>
  <p>
    პარტნიორის მიერ განთავსებული ყოველი შეთავაზების ფასდაკლება არ უნდა იყოს
    {{min_discount_pct}}%-ზე ნაკლები.
  </p>

  <h2>10. საკომისიო და ანგარიშსწორება</h2>
  <p>10.1. პლატფორმის საკომისიო შეადგენს {{commission_percentage}}%-ს.</p>
  <p>
    10.2. ანგარიშსწორება ხდება {{settlement_cycle}}, {{settlement_day}}ს, მინიმალური
    გადასარიცხი თანხაა {{min_payout_amount}} ₾.
  </p>
  <p>10.3. მიწოდების საფასურს იხდის {{delivery_fee_payer}}.</p>
  <p>10.4. საგადახდო მომსახურების საკომისიო — {{payment_processing_fee}}.</p>

  <h2>15. პასუხისმგებლობა</h2>
  <p>
    15.4. მხარის პასუხისმგებლობის ზედა ზღვარი შეადგენს ბოლო სამი თვის საკომისიოს
    {{liability_cap_multiplier}}-ჯერად ოდენობას.
  </p>

  <h2>17. ხელშეკრულების შეწყვეტა</h2>
  <p>
    17.1. თითოეულ მხარეს უფლება აქვს შეწყვიტოს ხელშეკრულება
    {{termination_notice_days}} კალენდარული დღით ადრე წერილობითი შეტყობინებით.
  </p>
  <p>
    17.3. დარღვევის აღმოფხვრის ვადა შეადგენს {{cure_period_days}} სამუშაო დღეს.
  </p>

  <h2>21. დასკვნითი დებულებები</h2>
  <p>
    21.1. ხელშეკრულება ძალაში შედის {{effective_date}}-დან.
  </p>
  <p>
    21.3. ხელშეკრულების ხელმოწერა შესაძლებელია კვალიფიციური ელექტრონული ხელმოწერით
    ან კანონმდებლობით ნებადართული სხვა ელექტრონული საშუალებით.
  </p>

  <h2>დანართი 1</h2>
  <ul>
    <li>პლატფორმის საკომისიო: {{commission_percentage}}%</li>
    <li>მომსახურების დაწყების თარიღი: {{service_start_date}}</li>
    <li>განსაკუთრებული პირობები: {{special_conditions}}</li>
  </ul>

  <h2>მხარეთა ხელმოწერები</h2>
  <table class="signatures">
    <tr>
      <td>
        <p><strong>პლატფორმა</strong></p>
        <p>შპს „ჩიფერი“ (Cheaper)</p>
      </td>
      <td>
        <p><strong>პარტნიორი</strong></p>
        <p>{{partner_legal_name}}</p>
        <p>ს/კ {{partner_identification_code}}</p>
        <p>{{partner_legal_address}}</p>
        <p>წარმომადგენელი: {{partner_representative_name}}</p>
        <p>ხელმოწერის თარიღი: {{signing_date}}</p>
      </td>
    </tr>
  </table>
</article>
`;

/** Minimal print styles used both for the on-screen preview and the generated PDF. */
export const CONTRACT_PRINT_CSS = `
.contract { font-family: FiraGO, "Noto Sans Georgian", system-ui, sans-serif; color: #111; line-height: 1.65; font-size: 14px; }
.contract h1 { font-size: 20px; font-weight: 700; margin: 0 0 12px; text-align: center; }
.contract h2 { font-size: 15px; font-weight: 700; margin: 22px 0 8px; }
.contract p { margin: 0 0 8px; }
.contract .meta { text-align: center; color: #444; font-size: 13px; }
.contract ul { margin: 0 0 8px 18px; }
.contract table.signatures { width: 100%; margin-top: 18px; border-collapse: collapse; }
.contract table.signatures td { vertical-align: top; width: 50%; padding: 8px; border: 1px solid #ddd; font-size: 13px; }
`;
