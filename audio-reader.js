/* SAFE — Article audio reader.
   Web Speech API (SpeechSynthesis). Works online and offline using the
   device's local voices; prefers en-GB neural / Google voices when present.
   Self-contained: injects its own CSS, builds its own UI, attaches to
   .article-header / .article-content automatically on blog post pages. */
(function () {
  'use strict';

  if (!('speechSynthesis' in window)) return;

  // -------------------------------------------------------------------------
  // Inject styles once
  // -------------------------------------------------------------------------
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
      '.audio-reader .ar-play:focus-visible{outline:2px solid var(--black);outline-offset:2px}' +
      '.audio-reader .ar-label{text-transform:uppercase;letter-spacing:.08em;' +
      'white-space:nowrap;color:var(--mid)}' +
      '.audio-reader .ar-track{flex:1;height:2px;background:var(--border);' +
      'border-radius:1px;position:relative;cursor:pointer;min-width:60px}' +
      '.audio-reader .ar-track:hover{height:4px;margin:-1px 0}' +
      '.audio-reader .ar-progress{position:absolute;inset:0 100% 0 0;' +
      'background:var(--black);border-radius:1px;transition:right .25s linear}' +
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
      '@media (max-width:560px){.audio-reader .ar-label{display:none}}';
    var style = document.createElement('style');
    style.id = 'audio-reader-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // -------------------------------------------------------------------------
  // Entry point
  // -------------------------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    var header = document.querySelector('.article-header');
    var content = document.querySelector('.article-content');
    if (!header || !content) return;
    if (header.querySelector('.audio-reader')) return; // already attached

    // ---------------------------------------------------------------------
    // Build player UI (inserted below the excerpt)
    // ---------------------------------------------------------------------
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
        '<div class="ar-progress"></div>' +
      '</div>' +
      '<span class="ar-time">0:00</span>' +
      '<button class="ar-rate" type="button" aria-label="Playback speed">1×</button>';
    header.appendChild(player);

    var playBtn  = player.querySelector('.ar-play');
    var playIcn  = player.querySelector('.ar-icon-play');
    var pauseIcn = player.querySelector('.ar-icon-pause');
    var label    = player.querySelector('.ar-label');
    var track    = player.querySelector('.ar-track');
    var progress = player.querySelector('.ar-progress');
    var timeEl   = player.querySelector('.ar-time');
    var rateBtn  = player.querySelector('.ar-rate');

    // ---------------------------------------------------------------------
    // Extract the readable text from title + excerpt + body
    // ---------------------------------------------------------------------
    var title   = (document.querySelector('.article-title') || {}).innerText || '';
    var excerpt = (document.querySelector('.article-excerpt') || {}).innerText || '';
    var chunks  = extractChunks(content, title, excerpt);
    var totalChars = chunks.reduce(function (s, c) { return s + c.length; }, 0);

    // Reading time estimate (chars / sec at rate 1.0)
    // English averages ~14–16 chars/sec including spaces at conversational pace.
    var CHARS_PER_SEC = 15;
    var rate = 1.0;
    var rateCycle = [1.0, 1.25, 1.5, 0.85];
    var rateIdx = 0;

    function totalSeconds() { return totalChars / (CHARS_PER_SEC * rate); }
    timeEl.textContent = fmt(totalSeconds());

    // ---------------------------------------------------------------------
    // Voice selection — prefer en-GB neural / Google voices, offline-safe
    // ---------------------------------------------------------------------
    var voice = null;
    function pickVoice() {
      var voices = speechSynthesis.getVoices();
      if (!voices.length) return null;
      var online = navigator.onLine !== false;
      function score(v) {
        var s = 0;
        if (/en[-_]GB/i.test(v.lang)) s += 100;
        else if (/^en/i.test(v.lang)) s += 50;
        if (/google|neural|natural|premium|enhanced|online/i.test(v.name)) s += 30;
        if (/samantha|sonia|libby|aria|jenny|emma|kate|martha|fiona|karen|moira/i.test(v.name)) s += 6;
        if (!online && !v.localService) s -= 500; // offline: avoid network voices
        return s;
      }
      var best = null, bestScore = -Infinity;
      voices.forEach(function (v) {
        var sc = score(v);
        if (sc > bestScore) { bestScore = sc; best = v; }
      });
      return best;
    }

    if (speechSynthesis.getVoices().length) {
      voice = pickVoice();
    } else {
      speechSynthesis.addEventListener('voiceschanged', function once() {
        voice = pickVoice();
        speechSynthesis.removeEventListener('voiceschanged', once);
      });
    }

    // ---------------------------------------------------------------------
    // Playback state
    // ---------------------------------------------------------------------
    var chunkIndex = 0;
    var charsBefore = 0;        // chars finished in prior chunks
    var currentChunkProgress = 0; // approximate chars spoken in current chunk
    var isPlaying = false;
    var isPaused = false;
    var timer = null;
    var lastTick = 0;
    var pauseResumeKeepAlive = null;

    function speakChunk() {
      if (chunkIndex >= chunks.length) { finishedAll(); return; }
      var text = chunks[chunkIndex];
      currentChunkProgress = 0;
      var u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.lang   = voice ? voice.lang : 'en-GB';
      u.rate   = rate;
      u.pitch  = 1.0;
      u.volume = 1.0;

      u.onboundary = function (e) {
        // not all engines fire boundary events, but use when available
        if (typeof e.charIndex === 'number') currentChunkProgress = e.charIndex;
        updateProgress();
      };
      u.onend = function () {
        charsBefore += text.length;
        currentChunkProgress = 0;
        chunkIndex++;
        if (isPlaying) speakChunk();
      };
      u.onerror = function (e) {
        if (!e || e.error === 'canceled' || e.error === 'interrupted') return;
        // Skip the failing chunk and continue
        charsBefore += text.length;
        chunkIndex++;
        if (isPlaying) speakChunk();
      };
      speechSynthesis.speak(u);
    }

    function play() {
      if (isPaused) {
        speechSynthesis.resume();
        isPaused = false;
        isPlaying = true;
        showPause();
        startTimer();
        startKeepAlive();
        label.textContent = 'Playing';
        return;
      }
      if (!voice) voice = pickVoice();
      isPlaying = true;
      isPaused = false;
      showPause();
      label.textContent = 'Playing';
      startTimer();
      startKeepAlive();
      speakChunk();
    }

    function pause() {
      if (!isPlaying) return;
      isPaused = true;
      isPlaying = false;
      try { speechSynthesis.pause(); } catch (_) {}
      showPlay();
      stopTimer();
      stopKeepAlive();
      label.textContent = 'Paused';
    }

    function stop() {
      isPlaying = false;
      isPaused = false;
      speechSynthesis.cancel();
      chunkIndex = 0;
      charsBefore = 0;
      currentChunkProgress = 0;
      showPlay();
      stopTimer();
      stopKeepAlive();
      updateProgress();
      timeEl.textContent = fmt(totalSeconds());
      label.textContent = 'Listen';
    }

    function finishedAll() {
      isPlaying = false;
      isPaused = false;
      chunkIndex = 0;
      charsBefore = 0;
      currentChunkProgress = 0;
      showPlay();
      stopTimer();
      stopKeepAlive();
      progress.style.right = '0%';
      track.setAttribute('aria-valuenow', '100');
      timeEl.textContent = fmt(0);
      label.textContent = 'Replay';
    }

    function updateProgress() {
      var spoken = charsBefore + currentChunkProgress;
      var pct = totalChars ? Math.min(100, (spoken / totalChars) * 100) : 0;
      progress.style.right = (100 - pct).toFixed(2) + '%';
      track.setAttribute('aria-valuenow', String(Math.round(pct)));
    }

    function startTimer() {
      stopTimer();
      lastTick = performance.now();
      timer = setInterval(function () {
        if (!isPlaying || isPaused) return;
        var now = performance.now();
        var dt = (now - lastTick) / 1000;
        lastTick = now;
        // Tick the current-chunk progress forward by an estimated chars-per-tick
        currentChunkProgress = Math.min(
          chunks[chunkIndex] ? chunks[chunkIndex].length : 0,
          currentChunkProgress + dt * CHARS_PER_SEC * rate
        );
        updateProgress();
        var spoken = charsBefore + currentChunkProgress;
        var remaining = Math.max(0, (totalChars - spoken) / (CHARS_PER_SEC * rate));
        timeEl.textContent = fmt(remaining);
      }, 250);
    }
    function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

    // Chrome bug workaround: long synthesis cuts out after ~15s. Tickle the
    // engine periodically while playing. (Harmless on other engines.)
    function startKeepAlive() {
      stopKeepAlive();
      pauseResumeKeepAlive = setInterval(function () {
        if (isPlaying && !isPaused && speechSynthesis.speaking) {
          try { speechSynthesis.pause(); speechSynthesis.resume(); } catch (_) {}
        }
      }, 10000);
    }
    function stopKeepAlive() {
      if (pauseResumeKeepAlive) { clearInterval(pauseResumeKeepAlive); pauseResumeKeepAlive = null; }
    }

    function showPlay()  { playIcn.hidden = false; pauseIcn.hidden = true;  playBtn.setAttribute('aria-label', 'Play article'); }
    function showPause() { playIcn.hidden = true;  pauseIcn.hidden = false; playBtn.setAttribute('aria-label', 'Pause article'); }

    // ---------------------------------------------------------------------
    // Wire up controls
    // ---------------------------------------------------------------------
    playBtn.addEventListener('click', function () {
      if (label.textContent === 'Replay') { stop(); play(); return; }
      if (isPlaying) pause(); else play();
    });

    function seekFromEvent(e) {
      var rect = track.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      var pct = Math.max(0, Math.min(1, x / rect.width));
      seek(pct);
    }
    function seek(pct) {
      var target = totalChars * pct;
      var cum = 0;
      var idx = 0;
      for (var i = 0; i < chunks.length; i++) {
        if (cum + chunks[i].length > target) { idx = i; break; }
        cum += chunks[i].length;
        idx = i + 1;
      }
      var wasPlaying = isPlaying || isPaused;
      speechSynthesis.cancel();
      chunkIndex = idx;
      charsBefore = cum;
      currentChunkProgress = 0;
      updateProgress();
      if (wasPlaying) { isPaused = false; play(); }
    }
    track.addEventListener('click', seekFromEvent);
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); seek(Math.min(1, (charsBefore / totalChars) + 0.05)); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); seek(Math.max(0, (charsBefore / totalChars) - 0.05)); }
    });

    rateBtn.addEventListener('click', function () {
      rateIdx = (rateIdx + 1) % rateCycle.length;
      rate = rateCycle[rateIdx];
      rateBtn.textContent = (rate === 1 ? '1' : rate) + '×';
      if (isPlaying) {
        // Re-speak current chunk at new rate
        var resumeFrom = chunkIndex;
        var charsAt = charsBefore;
        speechSynthesis.cancel();
        chunkIndex = resumeFrom;
        charsBefore = charsAt;
        currentChunkProgress = 0;
        speakChunk();
      } else {
        timeEl.textContent = fmt(totalSeconds() - (charsBefore / (CHARS_PER_SEC * rate)));
      }
    });

    // Stop on navigate-away. Pause when tab hidden.
    window.addEventListener('beforeunload', function () { try { speechSynthesis.cancel(); } catch (_) {} });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && isPlaying) pause();
    });
    // Resume offline/online state changes: re-pick the best voice
    window.addEventListener('online',  function () { voice = pickVoice(); });
    window.addEventListener('offline', function () { voice = pickVoice(); });
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  function fmt(sec) {
    sec = Math.max(0, Math.round(sec));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function extractChunks(root, title, excerpt) {
    // Build a flat list of "speakable" pieces in document order, skipping
    // CTA boxes, checklists, scripts, the next-step panels.
    var clone = root.cloneNode(true);
    clone.querySelectorAll(
      '.cta-box, .checklist, .audio-reader, script, style, .example-box .cta-btn'
    ).forEach(function (n) { n.remove(); });

    var lines = [];
    if (title)   lines.push(title.trim());
    if (excerpt) lines.push(excerpt.trim());

    // Walk top-level block elements inside .article-content
    var blocks = clone.querySelectorAll('h2, h3, h4, p, li, blockquote');
    blocks.forEach(function (n) {
      var t = (n.innerText || n.textContent || '').replace(/\s+/g, ' ').trim();
      if (!t) return;
      // Strip the trailing arrow on links etc.
      t = t.replace(/[→←]/g, '').replace(/\s+/g, ' ').trim();
      if (!t) return;
      // Force a period after headings so the engine pauses
      if (/^H[2-4]$/.test(n.tagName) && !/[.!?]$/.test(t)) t += '.';
      lines.push(t);
    });

    var joined = lines.join(' ');

    // Split into sentence-ish chunks (≤ ~200 chars each) for smooth playback.
    var sentences = joined.match(/[^.!?]+[.!?]+(?:["')\]]+)?\s*/g) || [joined];
    var out = [];
    var buf = '';
    sentences.forEach(function (s) {
      s = s.trim();
      if (!s) return;
      if ((buf + ' ' + s).trim().length > 180) {
        if (buf) out.push(buf.trim());
        buf = s;
      } else {
        buf = (buf ? buf + ' ' : '') + s;
      }
    });
    if (buf.trim()) out.push(buf.trim());
    return out;
  }
})();
