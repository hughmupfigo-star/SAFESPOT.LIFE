/* SAFE — renders community "good news" submissions on news.html.
   Pulls published posts from /api/news-list and prints them.
   ALL user-submitted content is HTML-escaped before it is shown. */
(function () {
  'use strict';
  var mount = document.getElementById('community-news');
  if (!mount) return;

  function esc(s) {
    return (s == null ? '' : String(s))
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function fmtDate(s) {
    try {
      var d = new Date((s || '').replace(' ', 'T') + 'Z');
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return ''; }
  }
  function paragraphs(text) {
    return esc(text).split(/\n{2,}/).map(function (p) {
      return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  if (!document.getElementById('community-news-styles')) {
    var st = document.createElement('style');
    st.id = 'community-news-styles';
    st.textContent =
      '#community-news{display:grid;gap:20px;margin-top:8px}' +
      '.cn-card{border:1px solid var(--border);border-radius:6px;padding:24px;background:var(--off)}' +
      '.cn-head{font-size:20px;font-weight:400;line-height:1.3;margin:0 0 6px;color:var(--black)}' +
      '.cn-meta{font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.06em;color:var(--mid);margin:0 0 14px}' +
      '.cn-body{font-size:15px;line-height:1.7;color:var(--black)}' +
      '.cn-body p{margin:0 0 10px}' +
      '.cn-doc{display:inline-block;margin-top:12px;font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.06em;color:var(--black);border-bottom:1px solid var(--black);text-decoration:none;padding-bottom:1px}' +
      '.cn-empty{font-size:14px;color:var(--mid);line-height:1.7}' +
      'html[data-theme="dark"] .cn-card{background:#1a1a1a;border-color:#444}' +
      'html[data-theme="dark"] .cn-head,html[data-theme="dark"] .cn-body{color:#f5f5f5}';
    document.head.appendChild(st);
  }

  mount.innerHTML = '<p class="cn-empty">Loading good news&hellip;</p>';

  fetch('/api/news-list')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var posts = (data && data.posts) || [];
      if (!posts.length) {
        mount.innerHTML = '<p class="cn-empty">No community stories yet &mdash; be the first to <a href="submit-news.html" style="color:var(--black)">share some good news</a>.</p>';
        return;
      }
      mount.innerHTML = posts.map(function (p) {
        var by = [p.name, p.location].filter(Boolean).map(esc).join(' &middot; ');
        var date = fmtDate(p.created_at);
        var meta = [by, date].filter(Boolean).join(' &mdash; ');
        var doc = p.doc
          ? '<a class="cn-doc" href="' + esc(p.doc) + '" target="_blank" rel="noopener">View attached document &rarr;</a>'
          : '';
        return '<article class="cn-card">' +
          '<h3 class="cn-head">' + esc(p.headline) + '</h3>' +
          (meta ? '<p class="cn-meta">' + meta + '</p>' : '') +
          '<div class="cn-body">' + paragraphs(p.body) + '</div>' +
          doc +
          '</article>';
      }).join('');
    })
    .catch(function () {
      mount.innerHTML = '<p class="cn-empty">Couldn\'t load community stories right now. Please try again later.</p>';
    });
})();
