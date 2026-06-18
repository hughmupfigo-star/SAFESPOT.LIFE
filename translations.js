/* SAFE — Translations */
const translations = {
  en: {
    'load-more': 'Load More Stories',
    'hide-stories': 'Hide Older Stories',
    'size-guide': 'Size guide',
  },
  ja: {
    'load-more': 'さらにストーリーを読み込む',
    'hide-stories': '古いストーリーを隠す',
    'size-guide': 'サイズガイド',
  },
  es: {
    'load-more': 'Cargar más historias',
    'hide-stories': 'Ocultar historias antiguas',
    'size-guide': 'Guía de tallas',
  },
  fr: {
    'load-more': 'Charger plus d\'histoires',
    'hide-stories': 'Masquer les anciennes histoires',
    'size-guide': 'Guide des tailles',
  },
  de: {
    'load-more': 'Weitere Geschichten laden',
    'hide-stories': 'Alte Geschichten ausblenden',
    'size-guide': 'Größenleitfaden',
  },
  zh: {
    'load-more': '加载更多故事',
    'hide-stories': '隐藏旧故事',
    'size-guide': '尺寸指南',
  },
  ko: {
    'load-more': '더 많은 스토리 로드',
    'hide-stories': '이전 스토리 숨기기',
    'size-guide': '사이즈 가이드',
  }
};

window.getTranslation = function(key, lang) {
  if (translations[lang] && translations[lang][key]) {
    return translations[lang][key];
  }
  return translations['en'][key] || key;
};

window.applyTranslations = function(lang) {
  console.log('Applying translations for language:', lang);
  const elements = document.querySelectorAll('[data-i18n]');
  console.log('Found', elements.length, 'elements to translate');

  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    const text = window.getTranslation(key, lang);
    console.log('Setting', key, '=', text);
    el.textContent = text;
  });
};
