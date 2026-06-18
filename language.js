/* SAFE — Language selector */
(function(){
  'use strict';

  // Language configuration
  var languages = {
    en: { label: 'English', code: 'en' },
    ja: { label: '日本語', code: 'ja' },
    es: { label: 'Español', code: 'es' },
    fr: { label: 'Français', code: 'fr' },
    de: { label: 'Deutsch', code: 'de' },
    zh: { label: '中文', code: 'zh' },
    ko: { label: '한국어', code: 'ko' }
  };

  // Initialize language from localStorage or browser
  function initLanguage(){
    var html = document.documentElement;
    var stored = localStorage.getItem('safe-language');
    var lang = stored || getBrowserLanguage();

    setLanguage(lang);
    updateSelector(lang);
  }

  // Get browser language preference
  function getBrowserLanguage(){
    var browserLang = navigator.language || navigator.userLanguage;
    var baseLang = browserLang.split('-')[0];
    return languages[baseLang] ? baseLang : 'en';
  }

  // Set language
  function setLanguage(lang){
    var html = document.documentElement;
    html.setAttribute('lang', languages[lang].code);
    localStorage.setItem('safe-language', lang);
    // Apply translations if available
    if(window.applyTranslations && typeof window.applyTranslations === 'function'){
      window.applyTranslations(lang);
    }
    // Update debug display
    var langDebug = document.getElementById('lang-debug');
    if(langDebug) langDebug.textContent = lang;
    var elementsDebug = document.getElementById('elements-debug');
    if(elementsDebug) elementsDebug.textContent = document.querySelectorAll('[data-i18n]').length;
  }

  // Update selector dropdown
  function updateSelector(lang){
    var selector = document.querySelector('.lang-selector select');
    if(selector){
      selector.value = lang;
    }
  }

  // Global function to change language
  window.changeLanguage = function(lang){
    console.log('Changing language to:', lang);
    setLanguage(lang);
    updateSelector(lang);
  }

  // Initialize on page load
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initLanguage);
  } else {
    initLanguage();
  }
})();
