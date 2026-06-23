/* SAFE — Article audio reader.
   Neural narration via /api/tts (OpenAI voice, edge-cached). Reads the article
   block by block, highlighting the current paragraph and auto-scrolling, with a
   scrubber and speed control. Falls back to the browser's speech engine if the
   TTS endpoint is unavailable. Attaches to .article-header / .article-content. */
(function () {
  'use strict';

  var TTS_ENDPOINT = '/api/tts';
  // 0.05s silent clip used to unlock audio on iOS within the first tap.
  var SILENT = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQwAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAABhgC';

  if (!document.getElementById('audio-reader-styles')) {
    var css =
      '.audio-reader{display:flex;align-items:center;gap:12px;padding:10px 14px;' +
      'background:var(--off);border:1px solid var(--border);border-radius:4px;' +
      'margin-top:20px;margin-bottom:8px;font-family:var(--mono);font-size:11px;' +
      'color:var(--mid);user-select:none;-webkit-user-select:none}' +
      '.audio-reader .ar-play{width:30px;height:30px;display:inline-flex;' +
      'align-items:center;justify-content:center;background:var(--black);' +
      'color:#fff;border:0;border-radius:50%;cursor:pointer;flex-shrink:0;' +
      'padding:0;transition:opacity .15s ease}' +
      '.audio-reader .ar-play:hover{opacity:.85}' +
      '.audio-reader .ar-play[disabled]{opacity:.5;cursor:wait}' +
      '.audio-reader .ar-play:focus-visible{outline:2px solid var(--black);outline-offset:2px}' +
      '.audio-reader .ar-spin{width:13px;height:13px;border:2px solid rgba(255,255,255,.35);' +
      'border-top-color:#fff;border-radius:50%;animation:ar-rot .7s linear infinite}' +
      'html[data-theme="dark"] .audio-reader .ar-spin{border-color:rgba(0,0,0,.3);border-top-color:#000}' +
      '@keyframes ar-rot{to{transform:rotate(360deg)}}' +
      '.audio-reader .ar-label{text-transform:uppercase;letter-spacing:.08em;' +
      'white-space:nowrap;color:var(--mid)}' +
      '.audio-reader .ar-track{flex:1;height:2px;background:var(--border);' +
      'border-radius:1px;position:relative;cursor:pointer;min-width:60px}' +
      '.audio-reader .ar-track:hover{height:4px;margin:-1px 0}' +
      '.audio-reader .ar-progress{position:absolute;inset:0 100% 0 0;' +
      'background:var(--black);border-radius:1px}' +
      '.audio-reader .ar-time{font-variant-numeric:tabular-nums;min-width:34px;' +
      'text-align:right;color:var(--mid)}' +
      '.audio-reader .ar-rate{background:transparent;border:1px solid var(--border);' +
      'border-radius:2px;padding:3px 6px;font-family:var(--mono);font-size:10px;' +
      'color:var(--mid);cursor:pointer;letter-spacing:.05em}' +
      '.audio-reader .ar-rate:hover{border-color:var(--black);color:var(--black)}' +
      'html[data-theme="dark"] .audio-reader{background:#1a1a1a;border-color:#444}' +
      'html[data-theme="dark"] .audio-reader .ar-play{background:#fff;color:#000}' +
      'html[data-theme="dark"] .audio-reader .ar-progress{background:#fff}' +
      'html[data-theme="dark"] .audio-reader .ar-track{background:#333}' +
      'html[data-theme="dark"] .audio-reader .ar-rate{border-color:#444;color:#bbb}' +
      'html[data-theme="dark"] .audio-reader .ar-rate:hover{border-color:#fff;color:#fff}' +
      // paragraph highlight that follows the narration
      '.ar-reading{background:var(--off);box-shadow:0 0 0 6px var(--off);' +
      'border-radius:3px;transition:background .25s ease,box-shadow .25s ease}' +
      'html[data-theme="dark"] .ar-reading{background:#202020;box-shadow:0 0 0 6px #202020}' +
      '@media (max-width:560px){.audio-reader .ar-label{display:none}}';
    var style = document.createElement('style');
    style.id = 'audio-reader-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

  function init() {
    var header = document.querySelector('.article-header');
    var content = document.querySelector('.article-content');
    if (!header || !content) return;
    if (header.querySelector('.audio-reader')) return;

    var blocks = extractBlocks(content);
    var titleEl = document.querySelector('.article-title');
    var excerptEl = document.querySelector('.article-excerpt');
    var intro = [];
    if (titleEl && titleEl.innerText.trim()) intro.push({ el: titleEl, text: clean(titleEl.innerText) });
    if (excerptEl && excerptEl.innerText.trim()) intro.push({ el: excerptEl, text: clean(excerptEl.innerText) });
    blocks = intro.concat(blocks);
    if (!blocks.length) return;

    var startChar = [], totalChars = 0;
    blocks.forEach(function (b, i) { startChar[i] = totalChars; totalChars += b.text.length + 1; });

    var player = document.createElement('div');
    player.className = 'audio-reader';
    player.setAttribute('role', 'region');
    player.setAttribute('aria-label', 'Listen to this article');
    player.innerHTML =
      '<button class="ar-play" type="button" aria-label="Play article">' +
        '<svg class="ar-icon-play" viewBox="0 0 24 24" width="11" height="11" aria-hidden="true">' +
          '<path d="M7 4 L20 12 L7 20 Z" fill="currentColor"/></svg>' +
        '<svg class="ar-icon-pause" viewBox="0 0 24 24" width="11" height="11" aria-hidden="true" hidden>' +
          '<rect x="6" y="4" width="4" height="16" fill="currentColor"/>' +
          '<rect x="14" y="4" width="4" height="16" fill="currentColor"/></svg>' +
      '</button>' +
      '<span class="ar-label">Listen</span>' +
      '<div class="ar-track" role="progressbar" aria-label="Audio progress" ' +
           'aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0">' +
        '<div class="ar-progress"></div></div>' +
      '<span class="ar-time">0:00</span>' +
      '<button class="ar-rate" type="button" aria-label="Playback speed">1×</button>';
    header.appendChild(player);

    var playBtn = player.querySelector('.ar-play');
    var playIcn = player.querySelector('.ar-icon-play');
    var pauseIcn = player.querySelector('.ar-icon-pause');
    var label = player.querySelector('.ar-label');
    var track = player.querySelector('.ar-track');
    var progress = player.querySelector('.ar-progress');
    var timeEl = player.querySelector('.ar-time');
    var rateBtn = player.querySelector('.ar-rate');

    var CHARS_PER_SEC = 15;
    timeEl.textContent = fmt(totalChars / CHARS_PER_SEC);

    var audio = new Audio();
    audio.preload = 'auto';
    var cache = {};            // i -> Promise<blobURL>
    var idx = 0;
    var isPlaying = false, started = false, unlocked = false, neuralBroken = false;
    var rate = 1.0, rateCycle = [1.0, 1.25, 1.5, 0.85], rateIdx = 0;

    function fetchAudio(i) {
      if (cache[i]) return cache[i];
      cache[i] = fetch(TTS_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: blocks[i].text })
      }).then(function (r) {
        if (!r.ok) throw new Error('tts ' + r.status);
        return r.blob();
      }).then(function (b) { return URL.createObjectURL(b); });
      cache[i].catch(function () { delete cache[i]; });
      return cache[i];
    }
    function prefetch(i) { if (i < blocks.length && !neuralBroken) fetchAudio(i).catch(function () {}); }

    function highlight(i) {
      blocks.forEach(function (b) { if (b.el) b.el.classList.remove('ar-reading'); });
      var el = blocks[i] && blocks[i].el;
      if (!el) return;
      el.classList.add('ar-reading');
      var r = el.getBoundingClientRect();
      if (r.top < 80 || r.bottom > window.innerHeight - 60) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    function setLoading(on) {
      if (on) { playBtn.setAttribute('disabled', ''); playIcn.hidden = true; pauseIcn.hidden = true;
        if (!player.querySelector('.ar-spin')) { var s = document.createElement('span'); s.className = 'ar-spin'; playBtn.appendChild(s); } }
      else { playBtn.removeAttribute('disabled'); var sp = player.querySelector('.ar-spin'); if (sp) sp.remove(); }
    }

    function playFrom(i) {
      idx = i;
      if (neuralBroken) return speechPlayFrom(i);
      setLoading(true); label.textContent = 'Loading';
      fetchAudio(i).then(function (url) {
        setLoading(false);
        audio.src = url; audio.playbackRate = rate;
        var pr = audio.play();
        if (pr && pr.catch) pr.catch(function () {});
        isPlaying = true; started = true; showPause(); label.textContent = 'Playing';
        highlight(i); prefetch(i + 1); prefetch(i + 2);
      }).catch(function () {
        setLoading(false);
        neuralBroken = true;             // first failure -> fall back permanently
        speechInit(); speechPlayFrom(i);
      });
    }

    audio.addEventListener('ended', function () {
      if (!isPlaying || neuralBroken) return;
      if (idx + 1 < blocks.length) playFrom(idx + 1); else finished();
    });
    audio.addEventListener('timeupdate', updateProgress);

    function updateProgress() {
      var dur = audio.duration || 0, cur = audio.currentTime || 0;
      var frac = dur ? Math.min(1, cur / dur) : 0;
      var spoken = startChar[idx] + frac * (blocks[idx] ? blocks[idx].text.length : 0);
      var pct = totalChars ? Math.min(100, spoken / totalChars * 100) : 0;
      progress.style.right = (100 - pct).toFixed(2) + '%';
      track.setAttribute('aria-valuenow', String(Math.round(pct)));
      var remaining = Math.max(0, (totalChars - spoken) / (CHARS_PER_SEC * rate));
      timeEl.textContent = fmt(remaining);
    }

    function finished() {
      isPlaying = false; started = false; idx = 0;
      clearHighlight(); showPlay(); progress.style.right = '0%';
      timeEl.textContent = fmt(totalChars / CHARS_PER_SEC); label.textContent = 'Replay';
    }
    function clearHighlight() { blocks.forEach(function (b) { if (b.el) b.el.classList.remove('ar-reading'); }); }

    function unlock() {
      if (unlocked) return; unlocked = true;
      try { audio.src = SILENT; var p = audio.play(); if (p && p.catch) p.catch(function () {}); audio.pause(); audio.currentTime = 0; } catch (e) {}
    }

    playBtn.addEventListener('click', function () {
      unlock();
      if (label.textContent === 'Replay') { idx = 0; playFrom(0); return; }
      if (neuralBroken) { speechToggle(); return; }
      if (isPlaying) {
        audio.pause(); isPlaying = false; showPlay(); label.textContent = 'Paused';
      } else if (started) {
        audio.play(); isPlaying = true; showPause(); label.textContent = 'Playing';
      } else { playFrom(0); }
    });

    function seek(pct) {
      var target = totalChars * pct, i = 0;
      for (i = 0; i < blocks.length; i++) { if (startChar[i] + blocks[i].text.length >= target) break; }
      if (i >= blocks.length) i = blocks.length - 1;
      if (neuralBroken) { speechPlayFrom(i); return; }
      isPlaying = true; playFrom(i);
    }
    track.addEventListener('click', function (e) {
      var rect = track.getBoundingClientRect();
      seek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
    });
    track.addEventListener('keydown', function (e) {
      var here = startChar[idx] / totalChars;
      if (e.key === 'ArrowRight') { e.preventDefault(); seek(Math.min(1, here + 0.05)); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); seek(Math.max(0, here - 0.05)); }
    });

    rateBtn.addEventListener('click', function () {
      rateIdx = (rateIdx + 1) % rateCycle.length;
      rate = rateCycle[rateIdx];
      rateBtn.textContent = (rate === 1 ? '1' : rate) + '×';
      audio.playbackRate = rate;
      if (neuralBroken && isPlaying) speechPlayFrom(idx);
    });

    function showPlay() { playIcn.hidden = false; pauseIcn.hidden = true; playBtn.setAttribute('aria-label', 'Play article'); }
    function showPause() { playIcn.hidden = true; pauseIcn.hidden = false; playBtn.setAttribute('aria-label', 'Pause article'); }

    window.addEventListener('beforeunload', function () { try { audio.pause(); speechSynthesis && speechSynthesis.cancel(); } catch (e) {} });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && isPlaying && !neuralBroken) { audio.pause(); isPlaying = false; showPlay(); label.textContent = 'Paused'; }
    });

    // ---- speechSynthesis fallback (used only if /api/tts is unavailable) ----
    var sVoice = null;
    function speechInit() {
      if (!('speechSynthesis' in window)) { label.textContent = 'Unavailable'; return; }
      var vs = speechSynthesis.getVoices();
      function pick() {
        var best = null, bs = -1;
        speechSynthesis.getVoices().forEach(function (v) {
          var s = 0;
          if (/en[-_]GB/i.test(v.lang)) s += 100; else if (/^en/i.test(v.lang)) s += 50;
          if (/google|neural|natural|premium|enhanced|online/i.test(v.name)) s += 30;
          if (s > bs) { bs = s; best = v; }
        });
        return best;
      }
      sVoice = pick();
      if (!vs.length) speechSynthesis.addEventListener('voiceschanged', function once() { sVoice = pick(); speechSynthesis.removeEventListener('voiceschanged', once); });
    }
    function speechPlayFrom(i) {
      idx = i; setLoading(false);
      speechSynthesis.cancel();
      isPlaying = true; started = true; showPause(); label.textContent = 'Playing';
      speakBlock();
    }
    function speakBlock() {
      if (idx >= blocks.length) { finished(); return; }
      highlight(idx);
      var u = new SpeechSynthesisUtterance(blocks[idx].text);
      if (sVoice) { u.voice = sVoice; u.lang = sVoice.lang; }
      u.rate = rate; u.pitch = 1.0;
      u.onend = function () { if (isPlaying) { idx++; var pct = startChar[Math.min(idx, blocks.length - 1)] / totalChars; progress.style.right = (100 - pct * 100).toFixed(1) + '%'; speakBlock(); } };
      u.onerror = function (e) { if (e && (e.error === 'canceled' || e.error === 'interrupted')) return; if (isPlaying) { idx++; speakBlock(); } };
      speechSynthesis.speak(u);
    }
    function speechToggle() {
      if (isPlaying) { speechSynthesis.pause(); isPlaying = false; showPlay(); label.textContent = 'Paused'; }
      else if (started) { speechSynthesis.resume(); isPlaying = true; showPause(); label.textContent = 'Playing'; }
      else { speechPlayFrom(0); }
    }
  }

  // ---- helpers ----
  function clean(t) { return (t || '').replace(/\s+/g, ' ').replace(/[→←]/g, '').trim(); }

  function fmt(sec) {
    sec = Math.max(0, Math.round(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function extractBlocks(root) {
    var skip = root.querySelectorAll('.cta-box, .checklist, .audio-reader, script, style, .example-box .cta-btn');
    var skipSet = [];
    skip.forEach(function (n) { skipSet.push(n); });
    function inSkip(el) { for (var i = 0; i < skipSet.length; i++) { if (skipSet[i].contains(el)) return true; } return false; }

    var out = [];
    var nodes = root.querySelectorAll('h2, h3, h4, p, li, blockquote');
    nodes.forEach(function (n) {
      if (inSkip(n)) return;
      var t = clean(n.innerText || n.textContent || '');
      if (!t) return;
      if (/^H[2-4]$/.test(n.tagName) && !/[.!?]$/.test(t)) t += '.';
      out.push({ el: n, text: t });
    });
    return out;
  }
})();
