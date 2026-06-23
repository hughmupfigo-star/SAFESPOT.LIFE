/* SAFE — blog comments (self-owned in your D1, pre-moderated).
   Shows approved comments for the current post and a form to add one.
   New comments are HELD for approval — nothing appears publicly until you approve it
   (you get an email with a one-click approve link). All content is escaped on display. */
(function () {
  'use strict';
  var content = document.querySelector('.article-content');
  if (!content || document.getElementById('blog-comments')) return;

  // slug = the post's filename, e.g. "blog-mutual-aid-101.html"
  var slug = (location.pathname.split('/').pop() || 'post').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 80) || 'post';

  function esc(s){ return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function fmtDate(s){ try{ var d=new Date((s||'').replace(' ','T')+'Z'); if(isNaN(d.getTime())) return ''; return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}); }catch(e){ return ''; } }
  function paras(t){ return esc(t).split(/\n{2,}/).map(function(p){ return '<p>'+p.replace(/\n/g,'<br>')+'</p>'; }).join(''); }

  var st = document.createElement('style');
  st.textContent =
    '#blog-comments{max-width:700px;margin:56px auto 0;padding-top:8px}' +
    '#blog-comments h2{font-family:var(--mono,monospace);font-size:13px;text-transform:uppercase;letter-spacing:.1em;color:var(--mid,#888);margin:0 0 20px;font-weight:500}' +
    '.bc-list{display:grid;gap:18px;margin-bottom:36px}' +
    '.bc-item{border:1px solid var(--border,#e5e5e5);border-radius:6px;padding:16px 18px;background:var(--off,#fafafa)}' +
    '.bc-meta{font-family:var(--mono,monospace);font-size:11px;letter-spacing:.05em;color:var(--mid,#888);margin:0 0 8px}' +
    '.bc-body{font-size:15px;line-height:1.7;color:var(--black,#111)}.bc-body p{margin:0 0 8px}' +
    '.bc-empty{font-size:14px;color:var(--mid,#888);margin-bottom:32px}' +
    '.bc-form{display:grid;gap:12px}' +
    '.bc-form .bc-row{display:grid;gap:12px;grid-template-columns:1fr 1fr}' +
    '.bc-form input,.bc-form textarea{width:100%;box-sizing:border-box;padding:12px 13px;font-family:inherit;font-size:14px;border:1px solid var(--border,#e5e5e5);border-radius:6px;background:var(--white,#fff);color:var(--black,#111)}' +
    '.bc-form textarea{min-height:110px;resize:vertical;font-family:var(--mono,monospace);line-height:1.6}' +
    '.bc-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}' +
    '.bc-sub{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--mid,#888)}' +
    '.bc-btn{justify-self:start;padding:12px 24px;background:var(--black,#111);color:#fff;border:0;border-radius:4px;cursor:pointer;font-family:var(--mono,monospace);font-size:12px;text-transform:uppercase;letter-spacing:.1em}' +
    '.bc-btn:disabled{opacity:.5;cursor:wait}' +
    '.bc-note{font-size:12px;color:var(--mid,#888);font-style:italic;margin:0}' +
    '.bc-msg{display:none;font-size:14px;padding:12px 15px;border-radius:6px}.bc-msg.show{display:block}' +
    '.bc-msg.ok{background:#e7f6ec;color:#1d4d31;border-left:3px solid #2e7d4f}' +
    '.bc-msg.err{background:#fff3cd;color:#663d00;border-left:3px solid #cc7a00}' +
    '@media(max-width:560px){.bc-form .bc-row{grid-template-columns:1fr}}' +
    'html[data-theme="dark"] .bc-item{background:#1a1a1a;border-color:#444}' +
    'html[data-theme="dark"] .bc-body{color:#f5f5f5}' +
    'html[data-theme="dark"] .bc-form input,html[data-theme="dark"] .bc-form textarea{background:#1a1a1a;color:#f5f5f5;border-color:#444}';
  document.head.appendChild(st);

  var sec = document.createElement('section');
  sec.id = 'blog-comments';
  sec.innerHTML =
    '<h2>Comments</h2>' +
    '<div class="bc-list" id="bc-list"></div>' +
    '<form class="bc-form" id="bc-form" autocomplete="off">' +
      '<div class="bc-row">' +
        '<input type="text" name="name" maxlength="60" placeholder="Your name" required>' +
        '<input type="email" name="email" maxlength="120" placeholder="Your email (not published)" required>' +
      '</div>' +
      '<textarea name="body" maxlength="2000" placeholder="Add to the conversation — be kind." required></textarea>' +
      '<label class="bc-sub"><input type="checkbox" name="subscribe"> Email me SAFE updates (optional)</label>' +
      '<div class="bc-hp" aria-hidden="true"><label>Leave empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' +
      '<button class="bc-btn" id="bc-btn" type="submit">Post comment</button>' +
      '<p class="bc-note">Comments are read by a person before they appear — this keeps the space safe.</p>' +
      '<div class="bc-msg" id="bc-msg" role="alert" aria-live="polite"></div>' +
    '</form>';
  (content.parentNode || content).insertBefore(sec, content.nextSibling);

  var listEl = document.getElementById('bc-list');
  var form = document.getElementById('bc-form');
  var btn = document.getElementById('bc-btn');
  var msg = document.getElementById('bc-msg');

  function showMsg(type, text){ msg.className = 'bc-msg show ' + type; msg.textContent = text; }

  function render(comments){
    if (!comments.length){ listEl.innerHTML = '<p class="bc-empty">No comments yet. Be the first.</p>'; return; }
    listEl.innerHTML = comments.map(function(c){
      var meta = [esc(c.name), fmtDate(c.created_at)].filter(Boolean).join('  &mdash;  ');
      return '<div class="bc-item"><p class="bc-meta">' + meta + '</p><div class="bc-body">' + paras(c.body) + '</div></div>';
    }).join('');
  }

  fetch('/api/comments?post=' + encodeURIComponent(slug))
    .then(function(r){ return r.json(); })
    .then(function(d){ render((d && d.comments) || []); })
    .catch(function(){ listEl.innerHTML = ''; });

  form.addEventListener('submit', function(e){
    e.preventDefault();
    msg.className = 'bc-msg';
    var fd = new FormData(form);
    fd.append('post', slug);
    btn.disabled = true; var lbl = btn.textContent; btn.textContent = 'Posting…';
    fetch('/api/comments', { method: 'POST', body: fd })
      .then(function(r){ return r.json().then(function(d){ return { ok: r.ok, d: d }; }); })
      .then(function(res){
        if (!res.ok) throw new Error((res.d && res.d.error) || 'Error');
        form.reset();
        showMsg('ok', 'Thanks! Your comment has been sent and will appear once it’s approved.');
      })
      .catch(function(err){ showMsg('err', (err && err.message) || 'Could not post your comment. Please try again.'); })
      .then(function(){ btn.disabled = false; btn.textContent = lbl; });
  });
})();
