/* SAFE — Shop
   Powers grouped product cards (one Stripe link per product code).
   - Colour thumbnails swap the slideshow source set
   - Slideshow cycles through views (front/back/side/etc)
   - Size selection is UI-only; customer confirms size via Stripe
     custom-field dropdown on the Stripe-hosted checkout page. */
(function(){
  'use strict';

  function $$(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  $$('.product-v2').forEach(function(card){
    var dataEl = card.querySelector('script[type="application/json"]');
    if(!dataEl) return;
    var data;
    try { data = JSON.parse(dataEl.textContent); } catch(e){ return; }
    if(!data || !data.colours || !data.colours.length) return;

    var imgEl   = card.querySelector('.product-img img');
    var dotsEl  = card.querySelector('.slide-dots');
    var thumbsEl= card.querySelector('.colour-thumbs');
    var labelEl = card.querySelector('.colour-label strong');
    var prevBtn = card.querySelector('.slide-nav .prev');
    var nextBtn = card.querySelector('.slide-nav .next');

    var currentColourIdx = 0;
    var currentViewIdx   = 0;

    function render(){
      var colour = data.colours[currentColourIdx];
      if(!colour) return;
      var view = colour.views[currentViewIdx];
      if(!view) { currentViewIdx = 0; view = colour.views[0]; }

      imgEl.src = view.src;
      imgEl.alt = data.code + ' — ' + colour.name + ' — ' + view.label;

      // rebuild dots for this colour (view count may vary)
      if(dotsEl){
        dotsEl.innerHTML = '';
        colour.views.forEach(function(v, i){
          var dot = document.createElement('button');
          dot.type = 'button';
          dot.setAttribute('aria-label', 'View ' + v.label);
          if(i === currentViewIdx) dot.classList.add('active');
          dot.addEventListener('click', function(){
            currentViewIdx = i;
            render();
          });
          dotsEl.appendChild(dot);
        });
      }

      // update colour label
      if(labelEl) labelEl.textContent = colour.name;

      // update active thumb
      if(thumbsEl){
        $$('.colour-thumb', thumbsEl).forEach(function(t, i){
          t.classList.toggle('active', i === currentColourIdx);
        });
      }

      // handle per-colour size availability
      if(sizeEl){
        var unavailable = colour.unavailableSizes || [];
        $$('.size-btn-v2', sizeEl).forEach(function(btn){
          var isUnavailable = unavailable.indexOf(btn.textContent.trim()) !== -1;
          btn.disabled = isUnavailable;
          if(isUnavailable) btn.classList.remove('active');
        });
        // if no size is active after disabling, select first available
        if(!sizeEl.querySelector('.size-btn-v2.active:not(:disabled)')){
          var firstAvail = sizeEl.querySelector('.size-btn-v2:not(:disabled)');
          if(firstAvail) firstAvail.classList.add('active');
        }
      }
    }

    // build colour thumbs
    if(thumbsEl){
      data.colours.forEach(function(colour, i){
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'colour-thumb' + (i === 0 ? ' active' : '');
        btn.setAttribute('title', colour.name);
        btn.setAttribute('aria-label', 'Show ' + colour.name);
        var img = document.createElement('img');
        img.src = colour.views[0].src;
        img.alt = colour.name;
        btn.appendChild(img);
        btn.addEventListener('click', function(){
          currentColourIdx = i;
          currentViewIdx   = 0;
          render();
        });
        thumbsEl.appendChild(btn);
      });
    }

    // prev/next arrows cycle through views for current colour
    if(prevBtn){
      prevBtn.addEventListener('click', function(){
        var len = data.colours[currentColourIdx].views.length;
        currentViewIdx = (currentViewIdx - 1 + len) % len;
        render();
      });
    }
    if(nextBtn){
      nextBtn.addEventListener('click', function(){
        var len = data.colours[currentColourIdx].views.length;
        currentViewIdx = (currentViewIdx + 1) % len;
        render();
      });
    }

    // size selection (UI only — confirmed on Stripe checkout via custom field)
    var sizeEl = card.querySelector('.size-select');
    if(sizeEl){
      $$('.size-btn-v2', sizeEl).forEach(function(btn){
        btn.addEventListener('click', function(){
          $$('.size-btn-v2', sizeEl).forEach(function(b){ b.classList.remove('active'); });
          btn.classList.add('active');
        });
      });
    }

    render();
  });
})();
