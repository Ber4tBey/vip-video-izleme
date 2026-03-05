import { Megaphone } from 'lucide-react';
import { useAds } from '../../context/AdsContext';
import { getMediaUrl } from '../../utils/api';

const adSizes = {
  leaderboard: 'h-[90px] max-w-[728px]',
  rectangle:   'h-[280px] max-w-[336px]',
  banner:      'h-[70px]',
};

/**
 * AdBanner — Reklam slotu
 * slotId: AdsContext'teki slot ID'si (örn. "home_leaderboard")
 * size: leaderboard | rectangle | banner (fallback boyutu)
 */
const AdBanner = ({ slotId, size = 'banner', className = '' }) => {
  const { getAd } = useAds();
  const ad = getAd(slotId);

  // Aktif değilse hiç render etme
  if (!ad || !ad.is_active) return null;

  const sizeCls = adSizes[size] ?? adSizes.banner;

  const content = (
    <img
      src={getMediaUrl(ad.image_url)}
      alt={ad.alt_text || 'Reklam'}
      loading="lazy"
      decoding="async"
      className="w-full h-full object-contain"
      onError={(e) => {
        // Resim yüklenemezse placeholder göster
        e.target.style.display = 'none';
        e.target.parentElement.dataset.broken = 'true';
      }}
    />
  );

  const inner = (
    <div
      className={`w-full ${sizeCls} mx-auto overflow-hidden rounded-xl bg-dark-700/60 border border-dark-500 flex items-center justify-center ${className}`}
    >
      {ad.image_url ? content : (
        <div className="flex items-center gap-2 text-gray-600 text-sm">
          <Megaphone size={14} className="opacity-40" />
          <span className="opacity-40">Reklam</span>
        </div>
      )}
    </div>
  );

  const adLink = ad.link || ad.link_url;
  if (adLink) {
    return (
      <a href={adLink} target="_blank" rel="noopener noreferrer nofollow" className="block w-full">
        {inner}
      </a>
    );
  }

  return inner;
};

export default AdBanner;
