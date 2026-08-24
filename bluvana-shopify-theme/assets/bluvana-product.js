(() => {
  const scope = document.querySelector('[data-bvp]');
  if (!scope) return;

  const variantsEl = scope.querySelector('[data-bvp-variants]');
  const variants = variantsEl ? JSON.parse(variantsEl.textContent) : [];
  if (!variants.length) return;

  const cartVariantEl = scope.querySelector('[data-bvp-cart-variant]');
  const cartVariant = cartVariantEl ? JSON.parse(cartVariantEl.textContent) : null;

  const colorIndex = parseInt(scope.dataset.colorIndex, 10) - 1; /* -1 when absent */
  const purchaseIndex = parseInt(scope.dataset.purchaseIndex, 10) - 1;
  const CARTRIDGE_PRICE = 1995;
  const handle = scope.dataset.handle;

  const money = (cents) => '$' + (cents / 100).toFixed(2);

  /* a variant is "bundle" when its purchase option mentions 3 */
  const isBundle = (v) => purchaseIndex >= 0 && /3/.test(v.options[purchaseIndex] || '');
  const colorOf = (v) => (colorIndex >= 0 ? v.options[colorIndex] : null);

  const idInput = scope.querySelector('[data-bvp-id]');
  const totalEl = scope.querySelector('[data-bvp-total]');
  const buyForm = scope.querySelector('form.bvp-form');
  const stickyBar = scope.querySelector('[data-bvp-sticky]');
  const stickyPrice = scope.querySelector('[data-bvp-total-mirror]');
  const qtyInput = scope.querySelector('[data-bvp-qty-input]');
  const colorNameEl = scope.querySelector('[data-bvp-color-name]');
  const offerEls = [...scope.querySelectorAll('[data-bvp-offer]')];
  const soloPriceEl = scope.querySelector('[data-bvp-solo-price]');
  const bundlePriceEl = scope.querySelector('[data-bvp-bundle-price]');
  const bundleCompareEl = scope.querySelector('[data-bvp-bundle-compare]');
  const saveChipEl = scope.querySelector('[data-bvp-save-chip]');
  const atcBtn = scope.querySelector('[data-bvp-atc]');
  const atcLabel = scope.querySelector('[data-bvp-atc-label]');
  const colorSoldoutEl = scope.querySelector('[data-bvp-color-soldout]');
  const stickyAtcBtn = scope.querySelector('[data-bvp-sticky-atc]');

  let currentColor = colorOf(variants[0]);
  const checkedSwatch = scope.querySelector('[data-bvp-color]:checked');
  if (checkedSwatch) currentColor = checkedSwatch.value;
  let currentOffer = variants.some(isBundle) ? 'bundle' : 'solo';
  const bundleRow = scope.querySelector('[data-bvp-offer="bundle"]');
  if (!variants.some(isBundle) && bundleRow) {
    bundleRow.hidden = true;
    currentOffer = 'solo';
    const soloRadio = scope.querySelector('[data-bvp-offer="solo"] input');
    if (soloRadio) soloRadio.checked = true;
  }

  const findVariant = (offer) =>
    variants.find((v) => {
      if (colorIndex >= 0 && colorOf(v) !== currentColor) return false;
      const bundle = isBundle(v);
      return offer === 'bundle' ? bundle : !bundle;
    });

  /* ---------- gallery ---------- */
  const slides = [...scope.querySelectorAll('[data-bvp-slide]')];
  const thumbs = [...scope.querySelectorAll('[data-bvp-thumb]')];

  let currentSlide = 0;
  const showSlide = (index) => {
    currentSlide = index;
    slides.forEach((s, i) => s.classList.toggle('is-active', i === index));
    thumbs.forEach((t, i) => {
      t.classList.toggle('is-active', i === index);
      t.setAttribute('aria-selected', String(i === index));
    });
  };

  thumbs.forEach((t, i) => t.addEventListener('click', () => showSlide(i)));

  /* stage prev/next arrows cycle with wraparound */
  const stagePrev = scope.querySelector('[data-bvp-prev]');
  const stageNext = scope.querySelector('[data-bvp-next]');
  if (stagePrev && slides.length > 1) {
    stagePrev.addEventListener('click', () => showSlide((currentSlide - 1 + slides.length) % slides.length));
  }
  if (stageNext && slides.length > 1) {
    stageNext.addEventListener('click', () => showSlide((currentSlide + 1) % slides.length));
  }

  const jumpToMedia = (mediaId) => {
    if (!mediaId) return;
    const index = slides.findIndex((s) => s.dataset.mediaId === String(mediaId));
    if (index >= 0) showSlide(index);
  };

  /* ---------- sync ---------- */
  let booted = false;
  const sync = () => {
    const solo = findVariant('solo');
    const bundle = findVariant('bundle');

    if (soloPriceEl && solo) soloPriceEl.textContent = money(solo.price);
    let saving = 0;
    if (bundle && bundlePriceEl) {
      bundlePriceEl.textContent = money(bundle.price);
      let compare;
      if (handle === 'replacement-cartridges' && solo) {
        compare = solo.price * 3;
      } else if (solo) {
        compare = solo.price + CARTRIDGE_PRICE * 3;
      }
      if (compare && compare > bundle.price) {
        saving = compare - bundle.price;
        if (bundleCompareEl) bundleCompareEl.textContent = money(compare);
        if (saveChipEl) saveChipEl.textContent = 'Save ' + Math.round((saving / compare) * 100) + '%';
      }
    }

    const saveLine = scope.querySelector('[data-bvp-save-line]');
    if (saveLine) {
      if (saving > 0 && currentOffer === 'bundle') {
        saveLine.innerHTML = 'You&rsquo;re saving <b>' + money(saving) + '</b> vs buying these separately.';
        saveLine.hidden = false;
      } else if (saving > 0) {
        saveLine.innerHTML = 'The bundle above saves you <b>' + money(saving) + '</b>.';
        saveLine.hidden = false;
      } else {
        saveLine.hidden = true;
      }
    }

    const active =
      currentOffer === 'cartridges' && cartVariant ? cartVariant
      : currentOffer === 'bundle' && bundle ? bundle
      : solo;
    if (!active) return;

    /* sold-out state: disable purchase, label it clearly */
    const isAvailable = !!active.available;
    if (atcBtn) {
      atcBtn.disabled = !isAvailable;
      atcBtn.classList.toggle('is-soldout', !isAvailable);
    }
    if (atcLabel) atcLabel.textContent = isAvailable ? 'Add to cart \u00b7\u00a0' : 'Sold out';
    if (totalEl) totalEl.hidden = !isAvailable;
    if (colorSoldoutEl) colorSoldoutEl.hidden = isAvailable;
    if (stickyAtcBtn) {
      stickyAtcBtn.disabled = !isAvailable;
      stickyAtcBtn.classList.toggle('is-soldout', !isAvailable);
      stickyAtcBtn.textContent = isAvailable ? 'Add to cart' : 'Sold out';
    }

    idInput.value = active.id;
    const qty = Math.max(1, parseInt(qtyInput && qtyInput.value, 10) || 1);
    if (totalEl) totalEl.textContent = money(active.price * qty);
    if (stickyPrice) stickyPrice.textContent = money(active.price * qty);

    offerEls.forEach((el) => el.classList.toggle('is-active', el.dataset.bvpOffer === currentOffer));
    if (colorNameEl && currentColor) colorNameEl.textContent = currentColor;

    if (booted && active.mediaId) jumpToMedia(active.mediaId);
    booted = true;
  };

  /* ---------- listeners ---------- */
  scope.querySelectorAll('[data-bvp-color]').forEach((radio) => {
    radio.addEventListener('change', () => {
      currentColor = radio.value;
      sync();
    });
  });

  offerEls.forEach((el) => {
    const radio = el.querySelector('input[type="radio"]');
    if (!radio) return;
    radio.addEventListener('change', () => {
      currentOffer = el.dataset.bvpOffer;
      sync();
    });
  });

  const stepQty = (delta) => {
    const next = Math.max(1, (parseInt(qtyInput.value, 10) || 1) + delta);
    qtyInput.value = next;
    sync();
  };

  const minus = scope.querySelector('[data-bvp-qty-minus]');
  const plus = scope.querySelector('[data-bvp-qty-plus]');
  if (minus) minus.addEventListener('click', () => stepQty(-1));
  if (plus) plus.addEventListener('click', () => stepQty(1));
  if (qtyInput) qtyInput.addEventListener('change', sync);

  /* ---------- tabs ---------- */
  const tabButtons = [...scope.querySelectorAll('[data-bvp-tab]')];
  const tabPanels = [...scope.querySelectorAll('[data-bvp-panel]')];
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabButtons.forEach((b) => b.classList.toggle('is-active', b === btn));
      tabPanels.forEach((p) => p.classList.toggle('is-active', p.dataset.bvpPanel === btn.dataset.bvpTab));
    });
  });

  /* ---------- reduces-list popovers (tap support; hover is pure CSS) ---------- */
  const xNames = [...scope.querySelectorAll('.bvp-x-name')];
  const closeTips = () => {
    scope.querySelectorAll('.bvp-x-item.is-open').forEach((el) => {
      el.classList.remove('is-open');
      const b = el.querySelector('.bvp-x-name');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
  };
  xNames.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.bvp-x-item');
      const wasOpen = item.classList.contains('is-open');
      closeTips();
      if (!wasOpen) {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.bvp-x-item')) closeTips();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeTips();
  });

  /* ---------- reviews wall: pagination ---------- */
  const reviewsEl = scope.querySelector('[data-bvp-reviews]');
  const reviewGrid = scope.querySelector('[data-bvp-review-grid]');
  if (reviewsEl && reviewGrid) {
    const REVIEWS = JSON.parse(reviewsEl.textContent);
    const PER_PAGE = 7;
    const pageCount = Math.max(1, Math.ceil(REVIEWS.length / PER_PAGE));
    const prevBtn = scope.querySelector('[data-bvp-review-prev]');
    const nextBtn = scope.querySelector('[data-bvp-review-next]');
    const pageEl = scope.querySelector('[data-bvp-review-page]');
    let page = 0;

    const el = (tag, cls, text) => {
      const node = document.createElement(tag);
      if (cls) node.className = cls;
      if (text != null) node.textContent = text;
      return node;
    };

    const renderPage = () => {
      reviewGrid.innerHTML = '';
      REVIEWS.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE).forEach((r) => {
        const card = el('article', 'bvp-review');
        card.appendChild(el('span', 'bvp-review-flag', '\u2713 Verified buyer'));
        const stars = el('span', 'bvp-stars', '\u2605\u2605\u2605\u2605\u2605');
        stars.setAttribute('aria-hidden', 'true');
        card.appendChild(stars);
        card.appendChild(el('p', null, r.t));
        if (r.img && r.img.length) {
          const row = el('div', 'bvp-review-imgs');
          r.img.forEach((src) => {
            const im = document.createElement('img');
            im.src = src;
            im.width = 64;
            im.height = 64;
            im.loading = 'lazy';
            im.alt = 'Buyer photo';
            row.appendChild(im);
          });
          card.appendChild(row);
        }
        const foot = el('footer');
        if (r.n) foot.appendChild(el('b', null, r.n));
        if (r.d) foot.appendChild(el('span', 'bvp-review-date', r.d));
        card.appendChild(foot);
        reviewGrid.appendChild(card);
      });
      if (pageEl) pageEl.textContent = 'Page ' + (page + 1) + ' of ' + pageCount;
      if (prevBtn) prevBtn.disabled = page === 0;
      if (nextBtn) nextBtn.disabled = page === pageCount - 1;
    };

    if (prevBtn) prevBtn.addEventListener('click', () => { if (page > 0) { page--; renderPage(); } });
    if (nextBtn) nextBtn.addEventListener('click', () => { if (page < pageCount - 1) { page++; renderPage(); } });
    renderPage();
  }

  /* ---------- write-a-review modal ---------- */
  const reviewModal = scope.querySelector('[data-bvp-review-modal]');
  if (reviewModal) {
    const openModal = () => { reviewModal.hidden = false; document.body.style.overflow = 'hidden'; };
    const closeModal = () => { reviewModal.hidden = true; document.body.style.overflow = ''; };
    scope.querySelectorAll('[data-bvp-review-open]').forEach((b) => b.addEventListener('click', openModal));
    reviewModal.querySelectorAll('[data-bvp-review-close]').forEach((b) => b.addEventListener('click', closeModal));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !reviewModal.hidden) closeModal(); });
    if (reviewModal.querySelector('[data-bvp-review-posted]')) openModal();

    /* submit without leaving the page; fall back to a normal POST */
    const reviewForm = reviewModal.querySelector('form.bvp-review-form');
    if (reviewForm) {
      reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = reviewForm.querySelector('[type="submit"]');
        if (btn) btn.disabled = true;
        try {
          const res = await fetch(reviewForm.action, {
            method: 'POST',
            body: new FormData(reviewForm),
          });
          if (!res.ok) throw new Error('post failed');
          reviewForm.innerHTML = '<p class="bvp-review-thanks">Thank you. Your review is in our inbox. We read and post every real one, usually within a day. Want photos added? Just reply to our confirmation email with them.</p>';
        } catch (err) {
          reviewForm.submit();
        }
      });
    }
  }

  /* ---------- premium scroll strips: momentum drag, arrow paging, edge fades ---------- */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const chevron = (dir) =>
    '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="' +
    (dir < 0 ? 'M10.5 2.5 5 8l5.5 5.5' : 'M5.5 2.5 11 8l-5.5 5.5') +
    '"/></svg>';

  scope.querySelectorAll('.bvp-proof-scroll, .bvp-creators-scroll, .bvp-vids-scroll, .bvp-thumbs').forEach((strip) => {
    const withArrows = !strip.classList.contains('bvp-thumbs');

    /* wrapper carries the edge fades and the arrow buttons */
    const wrap = document.createElement('div');
    wrap.className = 'bvp-strip-wrap';
    strip.parentNode.insertBefore(wrap, strip);
    wrap.appendChild(strip);

    let prevBtn = null;
    let nextBtn = null;

    const pageBy = (dir) => {
      const item = strip.querySelector(':scope > *');
      const styles = window.getComputedStyle(strip);
      const gap = parseFloat(styles.columnGap || styles.gap) || 0;
      const step = item ? item.getBoundingClientRect().width + gap : strip.clientWidth * 0.6;
      strip.scrollBy({
        left: dir * Math.max(step * 2, strip.clientWidth * 0.6),
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
    };

    if (withArrows) {
      prevBtn = document.createElement('button');
      prevBtn.type = 'button';
      prevBtn.className = 'bvp-strip-arrow bvp-strip-arrow--prev';
      prevBtn.setAttribute('aria-label', 'Scroll back');
      prevBtn.innerHTML = chevron(-1);
      nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'bvp-strip-arrow bvp-strip-arrow--next';
      nextBtn.setAttribute('aria-label', 'Scroll forward');
      nextBtn.innerHTML = chevron(1);
      wrap.appendChild(prevBtn);
      wrap.appendChild(nextBtn);
      prevBtn.addEventListener('click', () => pageBy(-1));
      nextBtn.addEventListener('click', () => pageBy(1));
    }

    /* keyboard support */
    strip.tabIndex = 0;
    strip.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); pageBy(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); pageBy(-1); }
    });

    /* fades + arrow availability */
    const update = () => {
      const max = strip.scrollWidth - strip.clientWidth;
      const atStart = strip.scrollLeft <= 2;
      const atEnd = strip.scrollLeft >= max - 2;
      wrap.classList.toggle('has-overflow', max > 4);
      wrap.classList.toggle('is-start', atStart);
      wrap.classList.toggle('is-end', atEnd);
      if (prevBtn) prevBtn.disabled = atStart;
      if (nextBtn) nextBtn.disabled = atEnd;
    };
    let scrollTick = false;
    strip.addEventListener('scroll', () => {
      if (scrollTick) return;
      scrollTick = true;
      requestAnimationFrame(() => { scrollTick = false; update(); });
    }, { passive: true });
    window.addEventListener('resize', update);
    update();

    /* drag with momentum glide (mouse); touch keeps native flick */
    let dragging = false;
    let startX = 0;
    let startLeft = 0;
    let lastX = 0;
    let lastT = 0;
    let vel = 0;
    let glideId = 0;

    const stopGlide = () => {
      if (glideId) cancelAnimationFrame(glideId);
      glideId = 0;
      strip.classList.remove('is-gliding');
    };

    strip.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      /* pointer capture on the strip retargets the click away from buttons/links
         (e.g. gallery thumbnails) — never start a drag from an interactive element */
      if (e.target.closest('button, a, input, video, summary')) return;
      stopGlide();
      dragging = true;
      startX = lastX = e.clientX;
      startLeft = strip.scrollLeft;
      lastT = performance.now();
      vel = 0;
      strip.classList.add('is-dragging');
      strip.setPointerCapture(e.pointerId);
      e.preventDefault(); /* stop native image drag / text select */
    });

    strip.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const now = performance.now();
      const dt = now - lastT;
      if (dt > 0) vel = (e.clientX - lastX) / dt;
      lastX = e.clientX;
      lastT = now;
      strip.scrollLeft = startLeft - (e.clientX - startX);
    });

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      strip.classList.remove('is-dragging');
      /* flick: decay the release velocity so the strip glides, then snap settles it */
      if (reduceMotion || Math.abs(vel) < 0.1) return;
      let v = vel * 18;
      strip.classList.add('is-gliding');
      const step = () => {
        v *= 0.94;
        strip.scrollLeft -= v;
        if (Math.abs(v) > 0.4) {
          glideId = requestAnimationFrame(step);
        } else {
          glideId = 0;
          strip.classList.remove('is-gliding');
        }
      };
      glideId = requestAnimationFrame(step);
    };
    strip.addEventListener('pointerup', endDrag);
    strip.addEventListener('pointercancel', endDrag);
  });

  sync();

  /* ---------- sticky mobile bar ---------- */
  const mainAtc = scope.querySelector('.bvp-form .bvp-atc');
  if (stickyBar && mainAtc && 'IntersectionObserver' in window) {
    stickyBar.hidden = false;
    const io = new IntersectionObserver(
      ([entry]) => stickyBar.classList.toggle('is-visible', !entry.isIntersecting),
      { threshold: 0 }
    );
    io.observe(mainAtc);
    const stickyAtc = scope.querySelector('[data-bvp-sticky-atc]');
    if (stickyAtc && buyForm) {
      stickyAtc.addEventListener('click', () => {
        if (buyForm.requestSubmit) buyForm.requestSubmit();
        else buyForm.submit();
      });
    }
  }
})();
