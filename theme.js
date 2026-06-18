/* SAFE — Theme toggle (dark/light mode) */
(function(){
  'use strict';

  // Initialize theme from localStorage or system preference
  function initTheme(){
    const html = document.documentElement;
    const stored = localStorage.getItem('safe-theme');

    if(stored){
      html.setAttribute('data-theme', stored);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if(prefersDark){
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('safe-theme', 'dark');
      }
    }

    updateToggleButton();
  }

  // Toggle between light and dark
  window.toggleTheme = function(){
    const html = document.documentElement;
    const current = html.getAttribute('data-theme') || 'light';
    const newTheme = current === 'dark' ? 'light' : 'dark';

    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('safe-theme', newTheme);
    updateToggleButton();
  }

  // Update button icon/text
  function updateToggleButton(){
    const btn = document.querySelector('.theme-toggle');
    if(!btn) return;

    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';

    btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  }

  // Initialize on page load
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }
})();
