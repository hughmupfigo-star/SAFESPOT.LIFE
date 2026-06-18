/* SAFE — Bento / Waffle menu.
   One script per page; injects a 3x3 icon-grid overlay that replaces the
   old "MENU" text toggle. No framework, no deps. */
(function(){
  'use strict';

  // --- Pages shown as tiles, in display order --------------------------------
  var pages = [
    { href: 'index.html',             label: 'Home',       icon: 'home' },
    { href: 'blog.html',              label: 'Blog',       icon: 'blog' },
    { href: 'story-intelligence.html', label: 'Stories',   icon: 'stories' },
    { href: 'news.html',              label: 'News',       icon: 'news' },
    { href: 'shop.html',              label: 'Shop',       icon: 'shop' },
    { href: 'library.html',           label: 'Book Store', icon: 'library' },
    { href: 'course.html',            label: 'Courses',    icon: 'courses' },
    { href: 'events.html',            label: 'Events',     icon: 'events' },
    { href: 'mission.html',           label: 'Mission',    icon: 'mission' },
    { href: 'hub.html',               label: 'The Hub',    icon: 'hub' },
    { href: 'music.html',             label: 'Music',      icon: 'music' },
    { href: 'about.html',             label: 'About',      icon: 'about' }
  ];
  var petition = {
    href: 'https://www.change.org/p/build-the-uk-s-first-holistic-youth-development-hub-to-transform-at-risk-lives',
    label: 'Sign Petition',
    icon: 'petition'
  };

  // --- Icon set. Stroked, 32x32 viewBox. Colours via currentColor. ----------
  function svg(paths){
    return '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" ' +
           'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" ' +
           'aria-hidden="true">' + paths + '</svg>';
  }
  var icons = {
    home: svg('<circle cx="16" cy="16" r="11"/><polygon points="16,9 19,16 16,23 13,16" fill="currentColor" stroke="none"/>'),
    mission: svg('<circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="6"/><circle cx="16" cy="16" r="1.8" fill="currentColor" stroke="none"/>'),
    hub: svg('<path d="M4 28 V14 L16 5 L28 14 V28 Z"/><path d="M13 28 V20 H19 V28"/>'),
    news: svg('<circle cx="16" cy="16" r="11"/><ellipse cx="16" cy="16" rx="4.5" ry="11"/><line x1="5" y1="16" x2="27" y2="16"/>'),
    shop: svg('<path d="M7 12 H25 L23.5 27 H8.5 Z"/><path d="M12 14 V9 A4 4 0 0 1 20 9 V14"/>'),
    careers: svg('<rect x="4" y="9" width="24" height="16" rx="1"/><path d="M12 9 V6 A2 2 0 0 1 20 6 V9"/><line x1="16" y1="13" x2="16" y2="21"/>'),
    library: svg('<rect x="6" y="5" width="20" height="22"/><line x1="11" y1="5" x2="11" y2="27"/><line x1="16" y1="11" x2="22" y2="11"/><line x1="16" y1="16" x2="22" y2="16"/><line x1="16" y1="21" x2="22" y2="21"/>'),
    publishing: svg('<rect x="6" y="5" width="20" height="22"/><line x1="11" y1="5" x2="11" y2="27"/><line x1="16" y1="11" x2="22" y2="11"/><line x1="16" y1="16" x2="22" y2="16"/><line x1="16" y1="21" x2="22" y2="21"/>'),
    courses: svg('<path d="M5 8 Q5 5 8 5 L24 5 Q27 5 27 8 L27 20 Q27 23 24 23 L8 23 Q5 23 5 20 Z"/><line x1="9" y1="10" x2="23" y2="10"/><line x1="9" y1="14" x2="18" y2="14"/><polygon points="20,13 24,16 20,19" fill="currentColor"/>'),
    about: svg('<circle cx="16" cy="12" r="4.5"/><path d="M7 27 C7 21 11 18 16 18 C21 18 25 21 25 27"/>'),
    music: svg('<circle cx="12" cy="10" r="2.5" fill="currentColor"/><line x1="14" y1="12" x2="14" y2="24"/><circle cx="20" cy="20" r="2.5" fill="currentColor"/><line x1="22" y1="22" x2="22" y2="24"/><path d="M14 12 Q18 14 22 22"/>'),
    faq: svg('<rect x="4" y="6" width="24" height="17" rx="1"/><polyline points="10,23 10,28 16,23"/><path d="M13 12 A3 3 0 0 1 19 12 C19 14 16 14 16 16.5"/><circle cx="16" cy="19.5" r="0.5" fill="currentColor" stroke="none"/>'),
    events: svg('<rect x="5" y="7" width="22" height="20" rx="1"/><line x1="5" y1="13" x2="27" y2="13"/><line x1="10" y1="4" x2="10" y2="10"/><line x1="22" y1="4" x2="22" y2="10"/>'),
    blog: svg('<path d="M7 4 H21 L26 9 V28 H7 Z"/><polyline points="21,4 21,9 26,9"/><line x1="11" y1="14" x2="22" y2="14"/><line x1="11" y1="18" x2="22" y2="18"/><line x1="11" y1="22" x2="18" y2="22"/>'),
    stories: svg('<path d="M4 6 H20 V17 H12 L8 21 V17 H4 Z"/><path d="M12 11 H28 V22 H22 L18 26 V22 H12 Z"/>'),
    petition: svg('<path d="M4 26 Q10 22 14 26 T22 26 T28 24"/><path d="M22 4 L28 10 L14 24 L8 24 L8 18 Z"/>')
  };

  // --- Figure out which tile is the current page ----------------------------
  var currentFile = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (currentFile === '') currentFile = 'index.html';

  // --- Build overlay HTML ---------------------------------------------------
  var tilesHTML = pages.map(function(p){
    var active = p.href.toLowerCase() === currentFile ? ' active' : '';
    return (
      '<a class="bento-tile' + active + '" href="' + p.href + '">' +
        '<span class="bento-tile-icon">' + icons[p.icon] + '</span>' +
        '<span class="bento-tile-label">' + p.label + '</span>' +
      '</a>'
    );
  }).join('');

  var primaryHTML =
    '<a class="bento-tile bento-tile-primary" href="' + petition.href +
       '" target="_blank" rel="noopener">' +
      '<span class="bento-tile-icon">' + icons.petition + '</span>' +
      '<span class="bento-tile-label">' + petition.label + '</span>' +
    '</a>';

  var overlayHTML =
    '<div class="bento-overlay" id="bentoOverlay" role="dialog" aria-modal="true" aria-label="Site menu" hidden>' +
      '<div class="bento-panel">' +
        '<div class="bento-header">' +
          '<span class="bento-brand">S·A·F·E — Menu</span>' +
          '<button class="bento-close" id="bentoClose" aria-label="Close menu">&times;</button>' +
        '</div>' +
        '<div class="bento-grid">' + tilesHTML + primaryHTML + '</div>' +
        '<p class="bento-footer">Steps Approaching Future Earth</p>' +
      '</div>' +
    '</div>';

  // --- Wire up -------------------------------------------------------------
  function init(){
    document.body.insertAdjacentHTML('beforeend', overlayHTML);

    var toggle = document.querySelector('.nav-toggle');
    if (toggle) {
      toggle.innerHTML =
        '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="20" height="20">' +
          '<rect x="3"   y="3"   width="5" height="5" rx="1"/>' +
          '<rect x="9.5" y="3"   width="5" height="5" rx="1"/>' +
          '<rect x="16"  y="3"   width="5" height="5" rx="1"/>' +
          '<rect x="3"   y="9.5" width="5" height="5" rx="1"/>' +
          '<rect x="9.5" y="9.5" width="5" height="5" rx="1"/>' +
          '<rect x="16"  y="9.5" width="5" height="5" rx="1"/>' +
          '<rect x="3"   y="16"  width="5" height="5" rx="1"/>' +
          '<rect x="9.5" y="16"  width="5" height="5" rx="1"/>' +
          '<rect x="16"  y="16"  width="5" height="5" rx="1"/>' +
        '</svg>';
      toggle.setAttribute('aria-label', 'Open menu');
      toggle.setAttribute('aria-haspopup', 'dialog');
      toggle.removeAttribute('onclick');
      toggle.addEventListener('click', openBento);
    }

    var overlay  = document.getElementById('bentoOverlay');
    var closeBtn = document.getElementById('bentoClose');

    closeBtn.addEventListener('click', closeBento);

    overlay.addEventListener('click', function(e){
      if (e.target === overlay) closeBento();
    });

    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && !overlay.hidden) closeBento();
    });

    function openBento(){
      overlay.hidden = false;
      requestAnimationFrame(function(){ overlay.classList.add('open'); });
      document.body.style.overflow = 'hidden';
      if (toggle) toggle.setAttribute('aria-expanded', 'true');
    }
    function closeBento(){
      overlay.classList.remove('open');
      document.body.style.overflow = '';
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
      setTimeout(function(){ overlay.hidden = true; }, 220);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
