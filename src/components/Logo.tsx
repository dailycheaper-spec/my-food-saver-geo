export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative w-9 h-9 rounded-xl gradient-hero grid place-items-center shadow-soft">
        <span className="text-primary-foreground text-lg font-bold">გ</span>
        <span className="absolute -top-1 -right-1 text-sm">🌿</span>
      </div>
      <div className="leading-tight">
        <div className="font-display font-bold text-lg tracking-tight">გემო</div>
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground -mt-0.5">გადაარჩინე</div>
      </div>
    </div>
  );
}
