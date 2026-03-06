import { Megaphone } from 'lucide-react';
import { useAds } from '../../context/AdsContext';
import { getMediaUrl } from '../../utils/api';

const adSizes = {
  leaderboard: 'min-h-[90px] max-w-[728px]',
  rectangle:   'min-h-[280px] max-w-[336px]',
  banner:      'min-h-[70px]',
};

/**
 * AdBanner — Reklam slotu
 * slotId: AdsContext'teki slot ID'si (örn. "home_leaderboard")
 * size: leaderboard | rectangle | banner (fallback boyutu)
 */
const AdBanner = ({ slotId, size = 'banner', className = '' }) => {
  const { getAd } = useAds();
  const ad = getAd(slotId);

  const sizeCls = adSizes[size] ?? adSizes.banner;

  // Aktif değilse boş placeholder render et (CLS önleme)
  if (!ad || !ad.is_active) {
    return <div className={`w-full ${sizeCls} mx-auto`} aria-hidden="true" />;
  }

  const content = (
    <img
      src={getMediaUrl(ad.image_url)}
      alt={ad.alt_text || 'Reklam'}
      loading="lazy"
      decoding="async"
      className="w-full h-full object-contain"
      width={size === 'rectangle' ? 336 : size === 'leaderboard' ? 728 : 728}
      height={size === 'rectangle' ? 280 : size === 'leaderboard' ? 90 : 70}
      onError={(e) => {
        e.target.style.display = 'none';
        e.target.parentElement.dataset.broken = 'true';
      }}
    />
  );

  const inner = (
    <div
      role="banner"
      aria-label="Reklam"
      className={`w-full ${sizeCls} mx-auto overflow-hidden rounded-xl bg-dark-700/60 border border-dark-500 flex items-center justify-center ${className}`}
    >
      {ad.image_url ? content : (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Megaphone size={14} />
          <span>Reklam</span>
        </div>
      )}
    </div>
  );

  const adLink = ad.link || ad.link_url;
  if (adLink) {
    return (
      <a href={adLink} target="_blank" rel="noopener noreferrer nofollow" className="block w-full" aria-label={ad.alt_text || 'Reklam bağlantısı'}>
        {inner}
      </a>
    );
  }

  return inner;
};

export default AdBanner;
