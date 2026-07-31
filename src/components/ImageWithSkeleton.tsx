import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";

type Props = {
  src: string | null | undefined;
  alt: string;
  /** Tailwind aspect / size classes for the wrapper, e.g. "aspect-[4/3]" or "w-10 h-10". */
  aspect?: string;
  /** Eager + high priority for above-the-fold imagery. */
  priority?: boolean;
  /** Extra classes for the wrapper. */
  className?: string;
  /** Extra classes for the <img> itself. */
  imgClassName?: string;
  objectFit?: "cover" | "contain";
  /** Rendered instead of the image when src is missing or fails to load. */
  fallback?: React.ReactNode;
  fallbackSrc?: string;
} & Pick<ImgHTMLAttributes<HTMLImageElement>, "width" | "height" | "sizes">;

/**
 * Remote image with a themed pulsing skeleton underneath and a 250ms cross-fade
 * once the bitmap is actually decoded. The wrapper always reserves space, so no
 * layout shift happens while the image is in flight.
 */
export function ImageWithSkeleton({
  src,
  alt,
  aspect = "aspect-[4/3]",
  priority = false,
  className = "",
  imgClassName = "",
  objectFit = "cover",
  fallback,
  fallbackSrc,
  width,
  height,
  sizes,
}: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | null>(src ?? null);

  useEffect(() => {
    setCurrentSrc(src ?? null);
    setFailed(!src);
    // Images restored from cache can be complete before React attaches onLoad.
    setLoaded(Boolean(imgRef.current?.complete && imgRef.current.naturalWidth > 0));
  }, [src]);

  useEffect(() => {
    const image = imgRef.current;
    if (!image || !currentSrc) return;
    let alive = true;
    const reveal = () => {
      if (alive && image.naturalWidth > 0) setLoaded(true);
    };
    if (image.complete) reveal();
    else if (typeof image.decode === "function") void image.decode().then(reveal).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [currentSrc]);

  const showFallback = failed || !currentSrc;

  return (
    <div className={`relative overflow-hidden bg-muted ${aspect} ${className}`}>
      {!loaded && !showFallback && (
        <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden="true" />
      )}

      {showFallback
        ? fallback ?? <div className="absolute inset-0 bg-muted" aria-hidden="true" />
        : (
          <img
            ref={imgRef}
            src={currentSrc ?? undefined}
            alt={alt}
            width={width}
            height={height}
            sizes={sizes}
            loading={priority ? "eager" : "lazy"}
            decoding={priority ? "sync" : "async"}
            fetchPriority={priority ? "high" : "auto"}
            onLoad={() => setLoaded(true)}
            onError={() => {
              if (fallbackSrc && currentSrc !== fallbackSrc) {
                setCurrentSrc(fallbackSrc);
                setLoaded(false);
                return;
              }
              setFailed(true);
              setLoaded(true);
            }}
            className={`absolute inset-0 w-full h-full ${objectFit === "cover" ? "object-cover" : "object-contain"} img-fade ${loaded ? "opacity-100" : "opacity-0"} ${imgClassName}`}
          />
        )}
    </div>
  );
}
