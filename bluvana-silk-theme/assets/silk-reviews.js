/* Bluvana Silk — review engine.
   Backend agnostic on purpose. Everything renders from one array of objects:
     { id, rating, title, body, name, email_verified, date, photos[], meta }
   Point data-endpoint at Judge.me, Supabase or your own API and this stops
   using the seed data. Submission posts JSON (or multipart when photos are
   attached) to data-submit. */
(function () {
  var PAGE = 6;

  function star(filled) {
    return '<svg viewBox="0 0 20 20" aria-hidden="true"' + (filled ? '' : ' opacity=".22"') +
      '><path d="M10 1.5l2.5 5.4 5.9.7-4.4 4 1.2 5.9L10 14.6 4.8 17.5 6 11.6 1.6 7.6l5.9-.7z"/></svg>';
  }

  function stars(n) {
    var out = '';
    for (var i = 1; i <= 5; i++) out += star(i <= Math.round(n));
    return out;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function when(d) {
    var t = new Date(d);
    if (isNaN(t)) return '';
    return t.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function init(root) {
    var listEl = root.querySelector('[data-sk-list]');
    var emptyEl = root.querySelector('[data-sk-empty]');
    var moreEl = root.querySelector('[data-sk-loadmore]');
    var barsEl = root.querySelector('[data-sk-bars]');
    var stripEl = root.querySelector('[data-sk-photostrip]');
    var avgEl = root.querySelector('[data-sk-avg]');
    var avgStarsEl = root.querySelector('[data-sk-avg-stars]');
    var totalEl = root.querySelector('[data-sk-total]');
    var sortMode = 'recent';

    var all = [];
    var filter = 'all';
    var minStars = 0;
    var shown = PAGE;

    /* ---------- data ---------- */
    function load() {
      var url = root.dataset.endpoint;
      if (url) {
        var sep = url.indexOf('?') === -1 ? '?' : '&';
        return fetch(url + sep + 'product=' + encodeURIComponent(root.dataset.handle || ''), {
          headers: { Accept: 'application/json' },
        })
          .then(function (r) { return r.ok ? r.json() : []; })
          .then(function (d) { return Array.isArray(d) ? d : (d.reviews || []); })
          .catch(function () { return seed(); });
      }
      return Promise.resolve(seed());
    }

    function seed() {
      var node = document.querySelector('[data-sk-review-seed]');
      if (!node) return [];
      try {
        var parsed = JSON.parse(node.textContent.trim() || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }

    /* ---------- render ---------- */
    function visible() {
      return all.filter(function (r) {
        if (minStars && Math.round(r.rating) !== minStars) return false;
        if (filter === 'photos') return (r.photos || []).length > 0;
        if (filter === 'verified') return !!r.verified;
        return true;
      });
    }

    function sortRows(rows) {
      var mode = sortMode;
      var copy = rows.slice();
      if (mode === 'helpful') copy.sort(function (a, b) { return b.rating - a.rating; });
      else if (mode === 'lowest') copy.sort(function (a, b) { return a.rating - b.rating; });
      else if (mode === 'photos') copy.sort(function (a, b) {
        return (b.photos || []).length - (a.photos || []).length || new Date(b.date) - new Date(a.date);
      });
      else copy.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
      return copy;
    }

    function card(r) {
      var pics = (r.photos || []).map(function (src) {
        return '<button type="button" data-sk-open-photo="' + esc(src) + '"><img src="' + esc(src) + '" alt="" loading="lazy"></button>';
      }).join('');
      return '<li class="sk-card2">' +
        '<div class="sk-card2__top"><span class="sk-stars" aria-label="' + r.rating + ' out of 5">' + stars(r.rating) + '</span>' +
        '<span class="sk-card2__date">' + esc(when(r.date)) + '</span></div>' +
        (r.title ? '<p class="sk-card2__t">' + esc(r.title) + '</p>' : '') +
        '<p class="sk-card2__body">' + esc(r.body) + '</p>' +
        (pics ? '<div class="sk-card2__pics">' + pics + '</div>' : '') +
        '<div class="sk-card2__foot">' +
        (r.verified ? '<span class="sk-verified">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M12 3.2 19 6v6c0 4.2-2.9 7.3-7 8.8-4.1-1.5-7-4.6-7-8.8V6z"/><path d="m8.8 11.9 2.2 2.2 4.2-4.4"/></svg>' +
          'Verified purchase</span>' : '') +
        '<span class="sk-card2__who">' + esc(r.name || 'Anonymous') + '</span>' +
        (r.meta ? '<span class="sk-card2__meta">' + esc(r.meta) + '</span>' : '') +
        '</div></li>';
    }

    function summary() {
      var n = all.length;
      var avg = n ? all.reduce(function (s, r) { return s + Number(r.rating || 0); }, 0) / n : 0;
      if (avgEl) avgEl.textContent = n ? avg.toFixed(1) : '0.0';
      if (avgStarsEl) avgStarsEl.innerHTML = stars(avg);
      if (totalEl) totalEl.textContent = n ? (n === 1 ? '1 review' : n.toLocaleString() + ' reviews') : 'No reviews yet';

      if (barsEl) {
        var rows = '';
        for (var s = 5; s >= 1; s--) {
          var c = all.filter(function (r) { return Math.round(r.rating) === s; }).length;
          var pct = n ? Math.round((c / n) * 100) : 0;
          rows += '<button class="sk-rev__bar" type="button" data-sk-star="' + s + '" aria-pressed="' + (minStars === s) + '">' +
            '<span class="sk-rev__bar-l">' + s + ' star</span>' +
            '<span class="sk-rev__bar-t"><span class="sk-rev__bar-f" style="width:' + pct + '%"></span></span>' +
            '<span class="sk-rev__bar-n">' + c + '</span></button>';
        }
        barsEl.innerHTML = rows;
      }

      var nAll = root.querySelector('[data-sk-n-all]');
      var nPh = root.querySelector('[data-sk-n-photos]');
      var nVe = root.querySelector('[data-sk-n-verified]');
      if (nAll) nAll.textContent = n;
      if (nPh) nPh.textContent = all.filter(function (r) { return (r.photos || []).length; }).length;
      if (nVe) nVe.textContent = all.filter(function (r) { return r.verified; }).length;

      /* hero rating, if the buy box asked for one */
      var heroCount = document.querySelector('[data-sk-hero-count]');
      var heroStars = document.querySelector('[data-sk-hero-stars]');
      if (heroCount) heroCount.textContent = n ? avg.toFixed(1) + ' · ' + n.toLocaleString() + ' reviews' : 'Be the first to review';
      if (heroStars) heroStars.innerHTML = stars(avg);

      if (stripEl) {
        var photos = all.reduce(function (acc, r) { return acc.concat(r.photos || []); }, []).slice(0, 14);
        stripEl.hidden = photos.length === 0;
        stripEl.innerHTML = photos.map(function (src) {
          return '<button class="sk-rev__photo" type="button" data-sk-open-photo="' + esc(src) + '"><img src="' + esc(src) + '" alt="" loading="lazy"></button>';
        }).join('');
      }
    }

    function paint() {
      var rows = sortRows(visible());
      var slice = rows.slice(0, shown);
      if (listEl) listEl.innerHTML = slice.map(card).join('');
      if (emptyEl) emptyEl.hidden = rows.length !== 0;
      if (moreEl) moreEl.hidden = rows.length <= shown;
    }

    /* ---------- controls ---------- */
    [].slice.call(root.querySelectorAll('[data-sk-filter]')).forEach(function (b) {
      b.addEventListener('click', function () {
        filter = b.dataset.skFilter;
        shown = PAGE;
        [].slice.call(root.querySelectorAll('[data-sk-filter]')).forEach(function (o) {
          o.setAttribute('aria-pressed', String(o === b));
        });
        paint();
      });
    });

    if (barsEl) {
      barsEl.addEventListener('click', function (e) {
        var b = e.target.closest('[data-sk-star]');
        if (!b) return;
        var s = parseInt(b.dataset.skStar, 10);
        minStars = minStars === s ? 0 : s;
        shown = PAGE;
        summary();
        paint();
      });
    }

    var d3 = root.querySelector('[data-sk-drop3]');
    if (d3) {
      var d3btn = d3.querySelector('[data-sk-drop3-btn]');
      var d3label = d3.querySelector('.sk-drop3__label');
      d3btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = d3.classList.toggle('is-open');
        d3btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      [].slice.call(d3.querySelectorAll('[data-sk-sort-opt]')).forEach(function (o) {
        o.addEventListener('click', function () {
          sortMode = o.dataset.skSortOpt;
          if (d3label) d3label.textContent = o.textContent.trim();
          [].slice.call(d3.querySelectorAll('[data-sk-sort-opt]')).forEach(function (x) {
            x.setAttribute('aria-selected', String(x === o));
          });
          d3.classList.remove('is-open');
          d3btn.setAttribute('aria-expanded', 'false');
          shown = PAGE;
          paint();
        });
      });
      document.addEventListener('click', function () {
        d3.classList.remove('is-open');
        d3btn.setAttribute('aria-expanded', 'false');
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          d3.classList.remove('is-open');
          d3btn.setAttribute('aria-expanded', 'false');
        }
      });
    }
    if (moreEl) moreEl.addEventListener('click', function () { shown += PAGE; paint(); });

    /* lightbox */
    var light = document.querySelector('[data-sk-light]');
    var lightImg = light && light.querySelector('[data-sk-light-img]');
    var lightCount = light && light.querySelector('[data-sk-light-count]');
    var pool = [];
    var at = 0;

    function allPhotos() {
      return all.reduce(function (acc, r) { return acc.concat(r.photos || []); }, []);
    }

    function lightShow(i) {
      if (!pool.length) return;
      at = ((i % pool.length) + pool.length) % pool.length;
      if (lightImg) lightImg.src = pool[at];
      if (lightCount) lightCount.textContent = (at + 1) + ' / ' + pool.length;
    }

    function lightSet(state, src) {
      if (!light) return;
      if (state) {
        pool = allPhotos();
        var idx = src ? pool.indexOf(src) : 0;
        lightShow(idx < 0 ? 0 : idx);
      }
      light.classList.toggle('is-open', state);
      light.setAttribute('aria-hidden', state ? 'false' : 'true');
      document.documentElement.style.overflow = state ? 'hidden' : '';
    }

    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-sk-open-photo]');
      if (b) { lightSet(true, b.dataset.skOpenPhoto); return; }
      if (e.target.closest('[data-sk-light-prev]')) { lightShow(at - 1); return; }
      if (e.target.closest('[data-sk-light-next]')) { lightShow(at + 1); return; }
      if (e.target.closest('[data-sk-light-close]') || e.target === light) lightSet(false);
    });
    document.addEventListener('keydown', function (e) {
      if (!light || !light.classList.contains('is-open')) return;
      if (e.key === 'Escape') lightSet(false);
      if (e.key === 'ArrowLeft') lightShow(at - 1);
      if (e.key === 'ArrowRight') lightShow(at + 1);
    });

    /* write panel */
    var panel = root.querySelector('[data-sk-write]');
    function writeSet(state) {
      if (!panel) return;
      if (state) {
        panel.hidden = false;
        requestAnimationFrame(function () {
          panel.classList.add('is-open');
          panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      } else {
        panel.classList.remove('is-open');
        setTimeout(function () { panel.hidden = true; }, 340);
      }
    }
    [].slice.call(root.querySelectorAll('[data-sk-write-open]')).forEach(function (b) {
      b.addEventListener('click', function () { writeSet(!panel.classList.contains('is-open')); });
    });
    var closeBtn = root.querySelector('[data-sk-write-close]');
    if (closeBtn) closeBtn.addEventListener('click', function () { writeSet(false); });

    /* star picker */
    var rate = root.querySelector('[data-sk-rate]');
    if (rate) {
      rate.addEventListener('change', function () {
        var on = rate.querySelector('input:checked');
        rate.className = 'sk-rate is-lit-' + (on ? on.value : 0);
      });
    }

    /* photo picker */
    var drop = root.querySelector('[data-sk-drop]');
    var files = root.querySelector('[data-sk-files]');
    var previews = root.querySelector('[data-sk-previews]');
    var picked = [];
    if (drop && files) {
      function take(fileList) {
        picked = [].slice.call(fileList).filter(function (f) { return /^image\//.test(f.type); }).slice(0, 5);
        if (!previews) return;
        previews.innerHTML = '';
        picked.forEach(function (f) {
          var img = document.createElement('img');
          img.src = URL.createObjectURL(f);
          previews.appendChild(img);
        });
      }
      files.addEventListener('change', function () { take(files.files); });
      ['dragenter', 'dragover'].forEach(function (ev) {
        drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-over'); });
      });
      drop.addEventListener('drop', function (e) {
        if (e.dataTransfer && e.dataTransfer.files) take(e.dataTransfer.files);
      });
    }

    /* submit */
    var form = root.querySelector('[data-sk-review-form]');
    var msg = root.querySelector('[data-sk-form-msg]');
    function say(text, bad) {
      if (!msg) return;
      msg.textContent = text;
      msg.hidden = !text;
      msg.classList.toggle('sk-form__msg--bad', !!bad);
    }

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var data = new FormData(form);
        if (!data.get('name') || !data.get('email') || !data.get('body')) {
          say('Please add your name, email and review.', true);
          return;
        }
        var endpoint = root.dataset.submit;
        if (!endpoint) {
          say('Review captured. Connect a submit endpoint to store it.');
          return;
        }
        picked.forEach(function (f, i) { data.append('photo_' + i, f); });
        data.append('product_id', root.dataset.product || '');
        data.append('product_handle', root.dataset.handle || '');

        var btn = form.querySelector('[data-sk-submit]');
        if (btn) btn.disabled = true;
        say('Sending...');

        fetch(endpoint, { method: 'POST', body: data })
          .then(function (r) {
            if (!r.ok) throw new Error(r.status);
            say('Thank you. Your review is in moderation.');
            form.reset();
            if (previews) previews.innerHTML = '';
            picked = [];
          })
          .catch(function () { say('That did not send. Please try again.', true); })
          .finally(function () { if (btn) btn.disabled = false; });
      });
    }

    /* smooth jump from the buy box */
    var jump = document.querySelector('[data-sk-jump]');
    if (jump) {
      jump.addEventListener('click', function (e) {
        e.preventDefault();
        root.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    load().then(function (rows) {
      all = rows.map(function (r) {
        return {
          rating: Number(r.rating || r.score || 5),
          title: r.title || '',
          body: r.body || r.content || '',
          name: r.name || r.author || 'Anonymous',
          verified: !!(r.verified || r.verified_buyer),
          date: r.date || r.created_at || '',
          photos: r.photos || r.pictures || [],
          meta: r.meta || '',
        };
      });
      summary();
      paint();
    });
  }

  function boot() {
    [].slice.call(document.querySelectorAll('[data-sk-reviews]')).forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
