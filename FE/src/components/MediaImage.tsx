import type { ImgHTMLAttributes } from "react";
import { resolveMediaUrl } from "../services/api";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> & {
  src?: string | null;
  kind?: "food" | "restaurant";
};

export default function MediaImage({ src, kind = "food", alt = "", ...props }: Props) {
  const fallback = `${import.meta.env.BASE_URL}images/${kind}-fallback.svg`;
  const resolved = resolveMediaUrl(src) || fallback;
  return <img {...props} key={resolved} src={resolved} alt={alt} onError={event => {
    // Switch once only, even if the fallback itself cannot be served.
    if (event.currentTarget.dataset.fallback === "true") return;
    event.currentTarget.dataset.fallback = "true";
    event.currentTarget.src = fallback;
  }} />;
}
