/**
 * Helper para lidar com imagens e fallback
 */

// Caminhos padrão
const DEFAULT_IMAGES = {
  course: '/uploads/courses/default/default-course.png',
  avatar: '/uploads/courses/default/default-course.png', // ou outra imagem específica
  logo: '/uploads/courses/default/default-course.png',    // ou outra imagem específica
  document: null // documentos não têm fallback
};

/**
 * Retorna o caminho da imagem com fallback automático
 * @param {string} imagePath - Caminho da imagem original
 * @param {string} type - Tipo de imagem ('course', 'avatar', 'logo')
 * @returns {string} Caminho seguro da imagem
 */
function getSafeImage(imagePath, type = 'course') {
  // Se não tiver imagem, retorna padrão
  if (!imagePath || imagePath.trim() === '') {
    return DEFAULT_IMAGES[type] || DEFAULT_IMAGES.course;
  }
  
  // Se já for um caminho completo, retorna ele mesmo
  if (imagePath.startsWith('/') || imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // Para cursos, monta o caminho completo
  if (type === 'course') {
    return `/uploads/courses/images/${imagePath}`;
  }
  
  return imagePath;
}

/**
 * Gera HTML seguro para uma imagem com fallback
 * @param {string} imagePath - Caminho da imagem
 * @param {string} alt - Texto alternativo
 * @param {string} className - Classes CSS
 * @param {string} type - Tipo de imagem
 * @returns {string} HTML da imagem
 */
function imgTag(imagePath, alt = '', className = '', type = 'course') {
  const src = getSafeImage(imagePath, type);
  const defaultSrc = DEFAULT_IMAGES[type] || DEFAULT_IMAGES.course;
  
  return `<img src="${src}" 
               alt="${alt}" 
               class="${className}" 
               onerror="this.onerror=null; this.src='${defaultSrc}'">`;
}

/**
 * Retorna apenas o caminho da imagem (útil para background images)
 * @param {string} imagePath - Caminho da imagem
 * @param {string} type - Tipo de imagem
 * @returns {string} Caminho seguro
 */
function bgImage(imagePath, type = 'course') {
  const src = getSafeImage(imagePath, type);
  const defaultSrc = DEFAULT_IMAGES[type] || DEFAULT_IMAGES.course;
  
  return `background-image: url('${src}');
          background-image: url('${src}'), url('${defaultSrc}');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;`;
}

module.exports = {
  getSafeImage,
  imgTag,
  bgImage,
  DEFAULT_IMAGES
};