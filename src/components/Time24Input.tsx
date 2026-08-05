/** Plain-text HH:MM input that always displays in 24-hour format, regardless of browser/OS locale (native `<input type="time">` renders AM/PM on some locales). */
export function Time24Input({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="HH:MM"
      maxLength={5}
      value={value}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
        const v = digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
        onChange(v);
      }}
      className={className}
    />
  );
}
