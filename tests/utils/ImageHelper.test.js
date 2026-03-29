const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getSafeImage,
  imgTag,
  bgImage,
  DEFAULT_IMAGES
} = require('../../src/utils/ImageHelper');

test('getSafeImage falls back to the default image when path is missing', () => {
  assert.equal(getSafeImage('', 'course'), DEFAULT_IMAGES.course);
  assert.equal(getSafeImage(null, 'logo'), DEFAULT_IMAGES.logo);
});

test('getSafeImage preserves absolute and external paths', () => {
  assert.equal(getSafeImage('/uploads/custom.png'), '/uploads/custom.png');
  assert.equal(getSafeImage('https://cdn.example.com/image.png'), 'https://cdn.example.com/image.png');
});

test('getSafeImage prefixes relative course images and preserves non-course relative paths', () => {
  assert.equal(getSafeImage('cover.webp', 'course'), '/uploads/courses/images/cover.webp');
  assert.equal(getSafeImage('avatar.png', 'avatar'), 'avatar.png');
});

test('imgTag builds an image tag with fallback handling', () => {
  const html = imgTag('cover.webp', 'Curso', 'rounded', 'course');

  assert.match(html, /src="\/uploads\/courses\/images\/cover\.webp"/);
  assert.match(html, /alt="Curso"/);
  assert.match(html, /class="rounded"/);
  assert.match(html, /this\.src='\/uploads\/courses\/default\/default-course\.png'/);
});

test('bgImage returns a CSS snippet with primary and fallback backgrounds', () => {
  const css = bgImage('cover.webp', 'course');

  assert.match(css, /background-image: url\('\/uploads\/courses\/images\/cover\.webp'\);/);
  assert.match(css, /url\('\/uploads\/courses\/default\/default-course\.png'\)/);
  assert.match(css, /background-size: cover;/);
});
