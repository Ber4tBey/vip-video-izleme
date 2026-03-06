import { Helmet } from 'react-helmet-async';
import { useSettings } from '../context/SettingsContext';

const SITE_URL = 'https://onlymix.tube';

const SEO = ({ 
  title, 
  description, 
  keywords, 
  image, 
  url, 
  type = 'website', 
  noindex = false,
  jsonLd = null,
}) => {
  const { settings } = useSettings();
  
  const siteName = settings?.siteName || 'OnlyMix';
  const defaultDescription = 'En yeni türk ifşa, porno, sikiş ve sex videolarını full HD kalitede izle. VIP içerikler, yerli modeller ve ifşa arşivleri.';
  const defaultKeywords = 'türk ifşa, porno, sex, sikiş, türkçe porno, yerli porno, ifşa videoları, türk modeller, onlyfans türk, vip porno, hd porno izle, porn, türk porno, ifşa izle';
  const defaultImage = `${SITE_URL}/android-chrome-192x192.png`;

  const finalTitle = title ? `${title}` : `${siteName} — Türk İfşa, Porno ve Sex Videoları İzle`;
  const finalDescription = description || defaultDescription;
  const finalKeywords = keywords ? `${keywords}, ${defaultKeywords}` : defaultKeywords;
  const finalImage = image || defaultImage;
  const finalUrl = url || (typeof window !== 'undefined' ? window.location.href : SITE_URL);

  return (
    <Helmet>
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={finalKeywords} />
      
      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:url" content={finalUrl} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:locale" content="tr_TR" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={finalImage} />

      {/* Canonical */}
      {finalUrl && <link rel="canonical" href={finalUrl} />}

      {/* Robots */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large" />
      )}

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
