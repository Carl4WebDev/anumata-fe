import { useState, type ImgHTMLAttributes } from "react";

type ProgressiveImageProps = ImgHTMLAttributes<HTMLImageElement> & { src: string };

/**
 * Never an empty box: the image's frame shows a soft grey placeholder right
 * away, then the picture fades in from a blur once it has decoded.
 */
export default function ProgressiveImage({ src, className = "", onLoad, alt, ...rest }: ProgressiveImageProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const loaded = loadedSrc === src;
  return (
    <img
      {...rest}
      src={src}
      alt={alt}
      decoding="async"
      onLoad={(e) => {
        setLoadedSrc(src);
        onLoad?.(e);
      }}
      className={`${className} transition-[filter,opacity] duration-500 ${
        loaded ? "opacity-100 blur-0" : "animate-pulse bg-slate-200 opacity-70 blur-sm"
      }`}
    />
  );
}
