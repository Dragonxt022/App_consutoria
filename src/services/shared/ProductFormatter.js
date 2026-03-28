function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeGalleryImages(rawImages, fallbackImage = '') {
  const source = Array.isArray(rawImages) ? rawImages : [rawImages];
  const normalized = source
    .flatMap((value) => String(value || '').split('\n'))
    .map((value) => value.trim())
    .filter(Boolean);

  if (fallbackImage && !normalized.includes(fallbackImage)) {
    normalized.unshift(fallbackImage);
  }

  return normalized.slice(0, 5);
}

function formatProduct(product) {
  const data = product.toJSON ? product.toJSON() : { ...product };
  const galleryImages = normalizeGalleryImages(data.galleryImages, data.imageUrl || '');

  return {
    ...data,
    galleryImages,
    primaryImage: galleryImages[0] || null,
    descriptionPlain: stripHtml(data.description)
  };
}

module.exports = {
  stripHtml,
  normalizeGalleryImages,
  formatProduct
};
