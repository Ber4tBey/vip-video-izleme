import { Helmet } from 'react-helmet-async';
import { useSettings } from '../context/SettingsContext';

const SEO = ({ title, description, keywords, image, url, type = 'website', noindex = false }) => {
  const { settings } = useSettings();
  
  const siteName = settings?.siteName || 'ONLYMIXMEDIA';
  const defaultDescription = 'En kaliteli VIP izleme platformu. Sınırsız VIP içerik deneyimi.';
  const defaultKeywords = 'türk ifşa, türk modeller, türk sikiş, porno, sex, ifşa, leak, full hd, sansürsüz, özel video';

  const finalTitle = title ? `${title} — ${siteName}` : siteName;
  const finalDescription = description ? `${description} ${defaultDescription}` : defaultDescription;
  const finalKeywords = keywords ? `${keywords}, ${defaultKeywords}` : defaultKeywords;
  const finalUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

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
      {image && <meta property="og:image" content={image} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      {image && <meta name="twitter:image" content={image} />}

      {/* Canonical */}
      {finalUrl && <link rel="canonical" href={finalUrl} />}

      {/* Robots */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}
    </Helmet>
  );
};

export default SEO;
