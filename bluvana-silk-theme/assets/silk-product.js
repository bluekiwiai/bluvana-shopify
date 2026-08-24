/* Bluvana Silk — product page: gallery, inline zoom, variants, size chart. */
(function () {
  function money(cents) {
    var f = (window.Shopify && Shopify.money_format) || '${{amount}}';
    var s = (cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return f.replace(/\{\{\s*amount[^}]*\}\}/, s);
  }

  /* ------------------------------------------------------------------------
     Gallery: arrows, thumbnails, and click to magnify in place.
     The cursor is the whole affordance, so there is no magnifier chrome.
     ------------------------------------------------------------------------ */
  function gallery(root) {
    var box = root.querySelector('[data-sk-stage-box]');
    var img = root.querySelector('[data-sk-stage]');
    if (!box || !img) return;

    var thumbs = [].slice.call(root.querySelectorAll('[data-sk-thumb]'));
    var srcs = thumbs.map(function (t) { return t.dataset.src; }).filter(Boolean);
    if (!srcs.length) srcs = [img.getAttribute('src')];

    var index = 0;
    var zoomed = false;
    var canZoom = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    function unzoom() {
      if (!zoomed) return;
      zoomed = false;
      box.classList.remove('is-zoomed', 'is-panning');
      img.style.transformOrigin = 'center center';
    }

    function setAspect(w, h) {
      if (w && h) box.style.setProperty('--ar', w / h);
    }

    function show(i, instant) {
      var n = srcs.length;
      index = ((i % n) + n) % n;
      unzoom();

      thumbs.forEach(function (t, k) {
        t.setAttribute('aria-current', k === index ? 'true' : 'false');
      });

      var next = new Image();
      next.onload = function () {
        if (instant) {
          img.src = next.src;
          setAspect(next.naturalWidth, next.naturalHeight);
          return;
        }
        box.classList.add('is-swapping');
        window.setTimeout(function () {
          img.src = next.src;
          setAspect(next.naturalWidth, next.naturalHeight);
          box.classList.remove('is-swapping');
        }, 170);
      };
      next.src = srcs[index];
    }

    root.__skShow = show;
    root.__skIndex = function () { return index; };
    root.__skSetIndex = function (i) { show(i); };

    /* first paint: take the real ratio so 9:16 and 1:1 both sit whole */
    if (img.complete && img.naturalWidth) setAspect(img.naturalWidth, img.naturalHeight);
    else img.addEventListener('load', function () { setAspect(img.naturalWidth, img.naturalHeight); }, { once: true });

    thumbs.forEach(function (t, i) {
      t.addEventListener('click', function (e) {
        e.preventDefault();
        show(i);
      });
    });

    var prev = root.querySelector('[data-sk-gal-prev]');
    var next = root.querySelector('[data-sk-gal-next]');
    function step(dir) {
      return function (e) {
        e.preventDefault();
        e.stopPropagation();
        show(index + dir);
      };
    }
    if (prev) prev.addEventListener('click', step(-1));
    if (next) next.addEventListener('click', step(1));

    if (!canZoom) return;

    function originFrom(e) {
      var r = box.getBoundingClientRect();
      var x = ((e.clientX - r.left) / r.width) * 100;
      var y = ((e.clientY - r.top) / r.height) * 100;
      img.style.transformOrigin =
        Math.max(0, Math.min(100, x)) + '% ' + Math.max(0, Math.min(100, y)) + '%';
    }

    box.addEventListener('click', function (e) {
      if (e.target.closest('[data-sk-gal-prev], [data-sk-gal-next]')) return;
      if (zoomed) {
        unzoom();
        return;
      }
      zoomed = true;
      originFrom(e);
      box.classList.add('is-zoomed');
      /* let the scale animate in first, then follow the cursor with no lag */
      window.setTimeout(function () {
        if (zoomed) box.classList.add('is-panning');
      }, 460);
    });

    box.addEventListener('mousemove', function (e) {
      if (zoomed) originFrom(e);
    });

    box.addEventListener('mouseleave', unzoom);
  }

  /* ------------------------------------------------------------------------
     Variants
     ------------------------------------------------------------------------ */
  function variants(pdp) {
    var node = document.querySelector('[data-sk-variants]');
    var form = document.getElementById('sk-product-form');
    if (!node || !form) return;

    var list;
    try { list = JSON.parse(node.textContent); } catch (e) { return; }
    if (!Array.isArray(list) || !list.length) return;

    var idField = form.querySelector('[data-sk-variant-id]');
    var priceEl = pdp.querySelector('[data-sk-price]');
    var wasEl = pdp.querySelector('[data-sk-was]');
    var atc = pdp.querySelector('[data-sk-atc]');
    var atcLabel = pdp.querySelector('[data-sk-atc-label]');

    function chosen() {
      return [].slice.call(form.querySelectorAll('[data-sk-radio]:checked')).map(function (r) { return r.value; });
    }

    function match(values) {
      return list.find(function (v) {
        return values.every(function (val, i) { return v.options[i] === val; });
      });
    }

    function paintLabels() {
      [].slice.call(pdp.querySelectorAll('[data-sk-opt]')).forEach(function (set) {
        var out = set.querySelector('[data-sk-opt-value]');
        var on = set.querySelector('[data-sk-radio]:checked');
        if (out && on) out.textContent = on.value;
      });
    }

    /* sold out combinations are marked, never disabled: the shopper has to be
       able to pick one so the back in stock form knows which it was */
    function paintAvailability() {
      var values = chosen();
      [].slice.call(pdp.querySelectorAll('[data-sk-opt]')).forEach(function (set) {
        var idx = parseInt(set.dataset.index, 10);
        [].slice.call(set.querySelectorAll('[data-sk-radio]')).forEach(function (radio) {
          var probe = values.slice();
          probe[idx] = radio.value;
          var v = match(probe);
          var out = !(v && v.available);
          var label = radio.nextElementSibling;
          if (!label) return;
          if (label.classList.contains('sk-swatch')) label.classList.toggle('sk-swatch--out', out);
          if (label.classList.contains('sk-size')) label.classList.toggle('sk-size--out', out);
          label.setAttribute('title', out ? radio.value + ' — sold out' : radio.value);
        });
      });
    }

    function update() {
      var v = match(chosen());
      paintLabels();
      paintAvailability();

      var sold = !v || !v.available;

      if (atc) atc.disabled = sold;
      if (atcLabel) atcLabel.textContent = !v ? 'Unavailable' : (sold ? 'Sold out' : 'Add to bag');
      [].slice.call(pdp.querySelectorAll('[data-sk-out-chip]')).forEach(function (c) { c.hidden = !sold; });

      var notify = pdp.querySelector('[data-sk-notify]');
      if (notify) {
        notify.hidden = !sold;
        var what = notify.querySelector('[data-sk-notify-what]');
        if (what) what.textContent = (v && v.title) || chosen().join(' / ');
        var tags = notify.querySelector('[data-sk-notify-tags]');
        if (tags && v) tags.value = ['back-in-stock', 'product-' + (window.__skHandle || ''), 'variant-' + v.id].join(',');
        var item = notify.querySelector('[data-sk-notify-item]');
        if (item && v) item.value = (window.__skTitle || '') + ' — ' + (v.title || '');
      }

      if (!v) return;

      if (idField) idField.value = v.id;
      if (priceEl) priceEl.textContent = money(v.price);
      if (wasEl) {
        var onSale = v.compare_at_price && v.compare_at_price > v.price;
        wasEl.hidden = !onSale;
        if (onSale) wasEl.textContent = money(v.compare_at_price);
      }

      /* jump the gallery to this variant's own image when one is assigned */
      if (v.featured_image && v.featured_image.src && pdp.__skShow) {
        var want = v.featured_image.src.split('?')[0].split('/').pop().split('.')[0];
        var thumbs = [].slice.call(pdp.querySelectorAll('[data-sk-thumb]'));
        for (var i = 0; i < thumbs.length; i++) {
          var have = (thumbs[i].dataset.src || '').split('?')[0].split('/').pop().split('.')[0];
          if (have === want) { pdp.__skShow(i); break; }
        }
      }

      if (window.history && window.history.replaceState) {
        var u = new URL(window.location.href);
        u.searchParams.set('variant', v.id);
        window.history.replaceState({}, '', u);
      }
    }

    form.addEventListener('change', function (e) {
      if (e.target.matches('[data-sk-radio]')) update();
    });
    update();
  }

  function qty(pdp) {
    var input = pdp.querySelector('.sk-qty input');
    if (!input) return;
    [].slice.call(pdp.querySelectorAll('[data-sk-qty]')).forEach(function (b) {
      b.addEventListener('click', function () {
        var next = (parseInt(input.value, 10) || 1) + parseInt(b.dataset.skQty, 10);
        input.value = Math.max(1, next);
      });
    });
  }

  function accordions(pdp) {
    [].slice.call(pdp.querySelectorAll('[data-sk-acc2]')).forEach(function (btn) {
      btn.addEventListener('click', function () {
        btn.setAttribute('aria-expanded', btn.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
      });
    });
  }

  function sizeChart() {
    var modal = document.querySelector('[data-sk-size-modal]');
    if (!modal) return;
    function set(state) {
      modal.classList.toggle('is-open', state);
      modal.setAttribute('aria-hidden', state ? 'false' : 'true');
      document.documentElement.style.overflow = state ? 'hidden' : '';
    }
    [].slice.call(document.querySelectorAll('[data-sk-size-open]')).forEach(function (b) {
      b.addEventListener('click', function () { set(true); });
    });
    var x = modal.querySelector('[data-sk-size-close]');
    if (x) x.addEventListener('click', function () { set(false); });
    modal.addEventListener('click', function (e) { if (e.target === modal) set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
  }

  function boot() {
    var pdp = document.querySelector('[data-sk-pdp]');
    if (!pdp) return;
    gallery(pdp);
    variants(pdp);
    qty(pdp);
    accordions(pdp);
    sizeChart();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  document.addEventListener('shopify:section:load', boot);
})();
