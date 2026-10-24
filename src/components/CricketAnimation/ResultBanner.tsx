import type { BannerFrame } from './sequences';

interface ResultBannerProps {
  banner: BannerFrame | null;
  bannerKey: string;
}

export function ResultBanner({ banner, bannerKey }: ResultBannerProps) {
  if (!banner) return null;
  return (
    <div key={bannerKey} className={`ca-banner ca-banner--${banner.kind}`} role="status" aria-live="polite">
      <div className="ca-banner__title">{banner.title}</div>
      <div className="ca-banner__subtitle">{banner.subtitle}</div>
    </div>
  );
}
