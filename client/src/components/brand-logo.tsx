import React from "react";
import { getBrandLogoUrl } from "@/lib/branding";

export function BrandLogo({
  size = 48,
  className = "",
  alt = "Brand",
}: {
  size?: number;
  className?: string;
  alt?: string;
}) {
  const src = getBrandLogoUrl();
  const px = `${size}px`;
  return (
    <div
      className={` overflow-hidden  flex items-center justify-center ${className}`}
      style={{ width: px, height: px }}
    >
      <img src={src} alt={alt} className="object-contain w-full h-full" />
    </div>
  );
}
