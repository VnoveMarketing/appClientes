import { cn } from "@/lib/utils";
import { AGENCY_ICON_SRC, AGENCY_LOGO_SRC, AGENCY_NAME } from "@/lib/brand";

type BrandImageProps = {
  className?: string;
  height?: number;
  width?: number;
};

export function AgencyLogo({ className, height = 32 }: BrandImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={AGENCY_LOGO_SRC}
      alt={AGENCY_NAME}
      height={height}
      className={cn("h-auto w-auto object-contain", className)}
      style={{ height }}
    />
  );
}

export function AgencyIcon({ className, height = 32, width = 32 }: BrandImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={AGENCY_ICON_SRC}
      alt={AGENCY_NAME}
      width={width}
      height={height}
      className={cn("object-contain", className)}
      style={{ width, height }}
    />
  );
}
