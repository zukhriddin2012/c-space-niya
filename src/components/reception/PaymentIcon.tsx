'use client';

import Image from 'next/image';

// Payment methods that have brand SVG icons
const BRAND_ICONS: Record<string, string> = {
  payme: '/icons/payments/payme.svg',
  click: '/icons/payments/click.svg',
  uzum: '/icons/payments/uzum.svg',
};

interface PaymentIconProps {
  code?: string;
  icon?: string;
  size?: number;
  className?: string;
}

export function PaymentIcon({ code, icon, size = 20, className = '' }: PaymentIconProps) {
  const brandIcon = code ? BRAND_ICONS[code.toLowerCase()] : undefined;

  if (brandIcon) {
    return (
      <Image
        src={brandIcon}
        alt={code || ''}
        width={size}
        height={size}
        className={`inline-block rounded ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  // Fallback to emoji
  if (icon) {
    return <span className={className} style={{ fontSize: size * 0.8 }}>{icon}</span>;
  }

  return null;
}
