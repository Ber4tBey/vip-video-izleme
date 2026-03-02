/**
 * Converts a video title to a URL-friendly slug.
 * "Sophia Rose - Özel Sahne!" → "sophia-rose-ozel-sahne"
 */
const trMap = {
  ç: 'c', Ç: 'C', ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I',
  ö: 'o', Ö: 'O', ş: 's', Ş: 'S', ü: 'u', Ü: 'U',
};

export const slugify = (text = '') =>
  text
    .split('')
    .map((c) => trMap[c] || c)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const matchSlug = (video, slug) => slugify(video.title) === slug;
