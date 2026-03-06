import { Crown, Check, Zap, Star, Shield, Send } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import SEO from '../../components/SEO';

const PLANS = [
  {
    id: 'monthly',
    name: 'Aylık',
    price: '₺99',
    period: '/ay',
    badge: null,
    features: [
      'Tüm VIP içeriklere erişim',
      'HD video kalitesi',
      'Reklamsız deneyim',
      'Öncelikli destek',
    ],
    btnClass: 'btn-ghost',
    cardClass: '',
  },
  {
    id: 'yearly',
    name: 'Yıllık',
    price: '₺799',
    period: '/yıl',
    badge: 'En Popüler',
    features: [
      'Tüm VIP içeriklere erişim',
      'HD & 4K video kalitesi',
      'Reklamsız deneyim',
      'Öncelikli destek',
      'Aylığa göre %33 tasarruf',
      'Yeni içeriklere erken erişim',
    ],
    btnClass: 'btn-vip',
    cardClass: 'border-vip-gold/50 relative',
  },
  {
    id: 'lifetime',
    name: 'Ömür Boyu',
    price: '₺1.999',
    period: '/tek seferlik',
    badge: 'En İyi Değer',
    features: [
      'Tüm VIP içeriklere sonsuz erişim',
      'HD & 4K video kalitesi',
      'Reklamsız deneyim',
      'VIP öncelik desteği',
      'Tüm gelecek içerikler',
      'Özel model erişimi',
    ],
    btnClass: 'btn-primary',
    cardClass: '',
  },
];

const BuyVIPPage = () => {
  const { settings } = useSettings();
  const tgLink = settings.telegramLink || 'https://t.me/yourusername';
  return (
    <>
    <SEO 
      title="VIP Üyelik Satın Al — Premium Porno ve İfşa Erişimi"
      description="VIP üyelik ile tüm özel türk ifşa, porno ve sex videolarına sınırsız erişim. Aylık, yıllık veya ömür boyu üyelik planları."
      keywords="vip üyelik, premium porno, vip ifşa, özel içerik, türk porno üyelik"
    />
    <div className="max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 badge-vip text-sm px-4 py-2 mb-4">
          <Crown size={16} />
          VIP Üyelik
        </div>
        <h1 className="text-4xl font-black text-white mb-4">
          Premium VIP Üyelik Planı
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          VIP üyelik ile tüm özel içeriklere sınırsız erişin. İstediğiniz zaman iptal edin.
        </p>
      </div>

      {/* Features row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Crown, label: 'VIP İçerikler', desc: 'Tüm özel videolar' },
          { icon: Zap, label: 'Hızlı Yükleme', desc: 'Kesintisiz izleme' },
          { icon: Shield, label: 'Güvenli Ödeme', desc: 'SSL korumalı' },
          { icon: Star, label: 'Premium Destek', desc: '7/24 destek' },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="card p-4 text-center">
            <Icon size={24} className="text-vip-gold mx-auto mb-2" />
            <p className="text-white font-semibold text-sm">{label}</p>
            <p className="text-gray-500 text-xs">{desc}</p>
          </div>
        ))}
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {PLANS.map((plan) => (
          <div key={plan.id} className={`card flex flex-col ${plan.cardClass}`}>
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="badge-vip px-3 py-1">{plan.badge}</span>
              </div>
            )}
            <div className="p-6 flex-1">
              <h3 className="text-white font-bold text-lg mb-1">{plan.name}</h3>
              <div className="flex items-end gap-1 mb-5">
                <span className="text-4xl font-black text-white">{plan.price}</span>
                <span className="text-gray-500 text-sm mb-1">{plan.period}</span>
              </div>
              <ul className="space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                    <Check size={15} className="text-primary-400 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-6 pt-0">
              <a
                href={tgLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`${plan.btnClass} w-full justify-center py-3 flex items-center gap-2`}
              >
                <Send size={15} />
                Telegram'dan Satın Al
              </a>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-gray-600 flex items-center justify-center gap-1.5">
        <Send size={11} className="text-primary-400" />
        Satın almak için Telegram üzerinden iletişime geçin. Tüm fiyatlar KDV dahildir.
      </p>
    </div>
    </>
  );
};

export default BuyVIPPage;
