import type { ReactNode } from "react";

/**
 * Cross-fades route content in once it's ready. While not ready it renders the
 * page skeleton (never a blank screen), so layout geometry is stable and the
 * swap is a pure opacity change.
 */
export function PageFade({
  ready,
  skeleton,
  children,
  className = "",
}: {
  ready: boolean;
  skeleton?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      {!ready && skeleton != null && (
        <div className="page-fade opacity-100" aria-hidden="true">{skeleton}</div>
      )}
      <div
        className={`page-fade ${ready ? "opacity-100" : "opacity-0"} ${!ready && skeleton != null ? "absolute inset-0 pointer-events-none" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}
