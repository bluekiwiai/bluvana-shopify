/* Bluvana Silk — header menus, mobile drawer, hero video. */
(function () {
  var mq = window.matchMedia('(max-width: 1000px)');

  function heroVideo() {
    var v = document.querySelector('[data-sk-hero-video]');
    if (!v) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      v.removeAttribute('autoplay');
      v.pause();
    }
  }

  function menus() {
    var items = [].slice.call(document.querySelectorAll('[data-sk-drop]'));
    var scrim = document.querySelector('[data-sk-scrim]');
    if (!items.length) return;

    function closeAll(except) {
      items.forEach(function (it) {
        if (it === except) return;
        it.classList.remove('is-open');
        var t = it.querySelector('[data-sk-trigger]');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
      if (scrim && !except) scrim.classList.remove('is-on');
    }

    items.forEach(function (item) {
      var trigger = item.querySelector('[data-sk-trigger]');
      if (!trigger) return;

      function open(state) {
        item.classList.toggle('is-open', state);
        trigger.setAttribute('aria-expanded', state ? 'true' : 'false');
        if (scrim) scrim.classList.toggle('is-on', state);
        if (state) closeAll(item);
      }

      trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        open(!item.classList.contains('is-open'));
      });
      item.addEventListener('mouseenter', function () {
        if (!mq.matches) open(true);
      });
      item.addEventListener('mouseleave', function () {
        if (!mq.matches) open(false);
      });
      item.addEventListener('focusout', function (e) {
        if (!item.contains(e.relatedTarget)) open(false);
      });
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('[data-sk-drop]')) closeAll();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAll();
    });
    if (scrim) scrim.addEventListener('click', function () { closeAll(); });
  }

  function drawer() {
    var el = document.querySelector('[data-sk-drawer]');
    var open = document.querySelector('[data-sk-open]');
    var close = document.querySelector('[data-sk-close]');
    if (!el || !open) return;

    function set(state) {
      el.classList.toggle('is-open', state);
      el.setAttribute('aria-hidden', state ? 'false' : 'true');
      open.setAttribute('aria-expanded', state ? 'true' : 'false');
      document.documentElement.style.overflow = state ? 'hidden' : '';
    }

    open.addEventListener('click', function () { set(true); });
    if (close) close.addEventListener('click', function () { set(false); });
    el.addEventListener('click', function (e) {
      if (e.target.closest('a')) set(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') set(false);
    });

    [].slice.call(el.querySelectorAll('[data-sk-acc]')).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var on = btn.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', on ? 'true' : 'false');
      });
    });
  }


  /* Lookbook strip: pointer drag, click a cell to bring it forward, arrows.
     Deliberately no visible scrollbar; the native chrome cheapens the brand. */
  function strip() {
    var vp = document.querySelector('[data-sk-strip]');
    if (!vp) return;
    var track = vp.querySelector('[data-sk-strip-track]');
    var prev = vp.querySelector('[data-sk-strip-prev]');
    var next = vp.querySelector('[data-sk-strip-next]');
    if (!track) return;

    var down = false, moved = false, startX = 0, startScroll = 0;

    function step() {
      var cell = track.firstElementChild;
      if (!cell) return track.clientWidth * 0.8;
      var gap = parseFloat(getComputedStyle(track).columnGap || '0') || 0;
      return cell.getBoundingClientRect().width + gap;
    }

    var nowEl = vp.parentNode.querySelector('[data-sk-strip-now]');
    var countEl = vp.parentNode.querySelector('[data-sk-strip-count]');
    var photos = track.querySelectorAll('.sk-line__cell:not(.sk-line__cell--end)').length;

    if (countEl && photos) {
      countEl.lastChild.nodeValue = ' / ' + String(photos).padStart(2, '0');
    }

    function sync() {
      var max = track.scrollWidth - track.clientWidth - 2;
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= max;
      if (nowEl && photos) {
        var i = Math.min(photos, Math.round(track.scrollLeft / step()) + 1);
        nowEl.textContent = String(i).padStart(2, '0');
      }
    }

    if (prev) prev.addEventListener('click', function () {
      track.scrollBy({ left: -step(), behavior: 'smooth' });
    });
    if (next) next.addEventListener('click', function () {
      track.scrollBy({ left: step(), behavior: 'smooth' });
    });

    track.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      down = true;
      moved = false;
      startX = e.clientX;
      startScroll = track.scrollLeft;
      track.setPointerCapture(e.pointerId);
    });

    track.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 4) {
        moved = true;
        track.classList.add('is-dragging');
      }
      if (moved) track.scrollLeft = startScroll - dx;
    });

    function release(e) {
      if (!down) return;
      down = false;
      if (track.hasPointerCapture && e.pointerId != null) {
        try { track.releasePointerCapture(e.pointerId); } catch (err) {}
      }
      if (moved) {
        track.classList.remove('is-dragging');
        /* settle on the nearest cell so a flick still lands cleanly */
        var s = step();
        track.scrollTo({ left: Math.round(track.scrollLeft / s) * s, behavior: 'smooth' });
      }
    }

    track.addEventListener('pointerup', release);
    track.addEventListener('pointercancel', release);

    /* a click that was not a drag brings that photo to the front */
    [].slice.call(track.children).forEach(function (cell) {
      cell.addEventListener('click', function () {
        if (moved) return;
        track.scrollTo({ left: cell.offsetLeft - track.offsetLeft, behavior: 'smooth' });
      });
    });

    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  }


  /* Auto rotating rails. Items are rendered twice, so once the scroll passes
     the halfway mark we jump back by exactly half the track width. The content
     is identical there, so the seam is invisible and the loop never ends. */
  function rails() {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    [].slice.call(document.querySelectorAll('[data-sk-rail]')).forEach(function (rail) {
      var track = rail.querySelector('[data-sk-rail-track]');
      var prev = rail.querySelector('[data-sk-rail-prev]');
      var next = rail.querySelector('[data-sk-rail-next]');
      if (!track || track.children.length < 2) return;

      var timer = null, paused = false;
      var down = false, moved = false, startX = 0, startScroll = 0;

      function step() {
        var cell = track.firstElementChild;
        var gap = parseFloat(getComputedStyle(track).columnGap || '0') || 0;
        return cell.getBoundingClientRect().width + gap;
      }

      function half() {
        return track.scrollWidth / 2;
      }

      function wrap() {
        var h = half();
        if (track.scrollLeft >= h) {
          track.classList.add('is-jumping');
          track.scrollLeft = track.scrollLeft - h;
          void track.offsetWidth;
          track.classList.remove('is-jumping');
        } else if (track.scrollLeft <= 0) {
          track.classList.add('is-jumping');
          track.scrollLeft = track.scrollLeft + h;
          void track.offsetWidth;
          track.classList.remove('is-jumping');
        }
      }

      function advance(dir) {
        wrap();
        track.scrollBy({ left: dir * step(), behavior: 'smooth' });
      }

      function start() {
        if (reduce || timer) return;
        timer = setInterval(function () {
          if (!paused && document.visibilityState === 'visible') advance(1);
        }, 10000);
      }

      function stop() {
        if (timer) { clearInterval(timer); timer = null; }
      }

      if (prev) prev.addEventListener('click', function () { advance(-1); });
      if (next) next.addEventListener('click', function () { advance(1); });

      rail.addEventListener('mouseenter', function () { paused = true; });
      rail.addEventListener('mouseleave', function () { paused = false; });
      rail.addEventListener('focusin', function () { paused = true; });
      rail.addEventListener('focusout', function () { paused = false; });

      track.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        down = true; moved = false; paused = true;
        startX = e.clientX;
        startScroll = track.scrollLeft;
        track.setPointerCapture(e.pointerId);
      });

      track.addEventListener('pointermove', function (e) {
        if (!down) return;
        var dx = e.clientX - startX;
        if (!moved && Math.abs(dx) > 4) { moved = true; track.classList.add('is-dragging'); }
        if (moved) track.scrollLeft = startScroll - dx;
      });

      function release(e) {
        if (!down) return;
        down = false;
        paused = false;
        if (e.pointerId != null) { try { track.releasePointerCapture(e.pointerId); } catch (err) {} }
        if (moved) {
          track.classList.remove('is-dragging');
          wrap();
        }
      }

      track.addEventListener('pointerup', release);
      track.addEventListener('pointercancel', release);
      var settle = null;
      track.addEventListener('scroll', function () {
        if (down) return;
        window.clearTimeout(settle);
        settle = window.setTimeout(wrap, 140);
      }, { passive: true });

      /* only run while the rail is on screen */
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries[0].isIntersecting ? start() : stop();
        }, { threshold: 0.1 }).observe(rail);
      } else {
        start();
      }
    });
  }


  function boot() {
    heroVideo();
    rails();
    strip();
    menus();
    drawer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  document.addEventListener('shopify:section:load', boot);
})();
