/* SAFE — Google AdSense for blog posts only.
   Inserts in-article ad units into .article-content: one mid-article, one at the end.
   The loader <script> lives in each blog post's <head>. Auto ads stay OFF.

   ── ONE-TIME SETUP ───────────────────────────────────────────────────────────
   In AdSense:  Ads  ->  By ad unit  ->  In-article ad  ->  create it.
   Copy the slot ID it gives you (a 10-digit number) and paste it into AD_SLOT below.
   Until you do, NO ad units are inserted — nothing breaks, the posts just show no ads.
*/
(function () {
  'use strict';

  var CLIENT  = 'ca-pub-9716856717779240';
  var AD_SLOT = 'PASTE_YOUR_IN_ARTICLE_SLOT_ID_HERE';   // e.g. '1234567890'
  var MAX_ADS = 2;   // 1 = end of article only · 2 = mid + end · 3 = two mid + end

  // Not configured yet, or not an article page → do nothing.
  if (!AD_SLOT || /PASTE|REPLACE|^$/.test(AD_SLOT)) return;
  var content = document.querySelector('.article-content');
  if (!content || content.getAttribute('data-ads-done')) return;
  content.setAttribute('data-ads-done', '1');

  if (!document.getElementById('blog-ad-styles')) {
    var st = document.createElement('style');
    st.id = 'blog-ad-styles';
    st.textContent =
      '.blog-ad{margin:40px 0;clear:both}' +
      '.blog-ad-label{font-family:var(--mono,monospace);font-size:10px;letter-spacing:.1em;' +
      'text-transform:uppercase;color:var(--mid,#999);text-align:center;margin-bottom:8px}';
    document.head.appendChild(st);
  }

  function makeAd() {
    var wrap = document.createElement('div');
    wrap.className = 'blog-ad';
    var label = document.createElement('div');
    label.className = 'blog-ad-label';
    label.textContent = 'Advertisement';
    var ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.style.textAlign = 'center';
    ins.setAttribute('data-ad-layout', 'in-article');
    ins.setAttribute('data-ad-format', 'fluid');
    ins.setAttribute('data-ad-client', CLIENT);
    ins.setAttribute('data-ad-slot', AD_SLOT);
    wrap.appendChild(label);
    wrap.appendChild(ins);
    return wrap;
  }

  function pushAd() {
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { /* loader not ready yet; it drains the queue on load */ }
  }

  // Block-level anchors we can safely insert between.
  var blocks = Array.prototype.filter.call(content.children, function (el) {
    return /^(P|H2|H3|UL|OL|BLOCKQUOTE)$/.test(el.tagName);
  });

  // Mid-article unit(s) — only if the article is long enough.
  var mids = Math.min(MAX_ADS - 1, 2);
  if (mids > 0 && blocks.length >= 6) {
    for (var i = 1; i <= mids; i++) {
      var idx = Math.max(2, Math.floor((blocks.length * i) / (mids + 1)));
      var anchor = blocks[idx];
      if (anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(makeAd(), anchor.nextSibling);
        pushAd();
      }
    }
  }

  // End-of-article unit.
  content.appendChild(makeAd());
  pushAd();
})();
