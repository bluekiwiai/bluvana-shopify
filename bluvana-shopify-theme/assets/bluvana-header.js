/* Bluvana header: solid-on-scroll state, boxed predictive search, mobile drawer */
(() => {
  /* ---------- solid header on scroll ----------
     Horizon scrolls an inner .page-wrapper, not the window, so listen to every
     scroll event via capture and read whichever container actually moved. */
  const headerComponent = document.querySelector('#header-component');
  if (headerComponent) {
    const wrapper = document.querySelector('.page-wrapper');
    const scrollTop = () =>
      Math.max(
        window.scrollY || 0,
        document.documentElement.scrollTop || 0,
        wrapper ? wrapper.scrollTop : 0
      );
    let ticking = false;
    const applyScrollState = () => {
      headerComponent.classList.toggle('bv-scrolled', scrollTop() > 24);
      ticking = false;
    };
    document.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(applyScrollState);
        }
      },
      { capture: true, passive: true }
    );
    applyScrollState();
  }

  /* ---------- boxed predictive search ---------- */
  const search = document.querySelector('[data-bv-search]');
  if (search) {
    const input = search.querySelector('.bv-boxsearch-input');
    const results = search.querySelector('.bv-search-results');
    const suggestUrl = search.dataset.suggestUrl || '/search/suggest';
    const searchUrl = search.dataset.searchUrl || '/search';
    let debounce = null;
    let lastQuery = '';

    const escapeHtml = (text) =>
      String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

    const render = (products, query) => {
      if (!products.length) {
        results.innerHTML = `<p class="bv-search-empty">Nothing yet for &ldquo;${escapeHtml(query)}&rdquo;</p>`;
        results.hidden = false;
        return;
      }
      const items = products
        .map((product) => {
          const image = product.featured_image && product.featured_image.url
            ? `<img src="${escapeHtml(product.featured_image.url)}&width=80" width="40" height="50" loading="lazy" alt="">`
            : '<span class="bv-search-thumb-empty"></span>';
          return `<li><a href="${escapeHtml(product.url)}">${image}<span class="bv-search-item-title">${escapeHtml(product.title)}</span><span class="bv-search-item-price">${escapeHtml(product.price || '')}</span></a></li>`;
        })
        .join('');
      results.innerHTML = `<ul role="list">${items}</ul><a class="bv-search-all" href="${searchUrl}?q=${encodeURIComponent(query)}">See all results<span aria-hidden="true"> &rarr;</span></a>`;
      results.hidden = false;
    };

    if (input && results) {
      input.addEventListener('input', () => {
        const query = input.value.trim();
        clearTimeout(debounce);
        if (query.length < 2) {
          results.hidden = true;
          return;
        }
        debounce = setTimeout(async () => {
          if (query === lastQuery) return;
          lastQuery = query;
          try {
            const response = await fetch(
              `${suggestUrl}.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=6&resources[options][unavailable_products]=last`
            );
            if (!response.ok) return;
            const data = await response.json();
            const products = (data.resources && data.resources.results && data.resources.results.products) || [];
            render(products, query);
          } catch (error) {
            /* network hiccup: the full search page still works */
          }
        }, 220);
      });

      input.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') results.hidden = true;
      });

      document.addEventListener('click', (event) => {
        if (!search.contains(event.target)) results.hidden = true;
      });
    }
  }

  /* ---------- mobile drawer ---------- */
  const burger = document.querySelector('.bv-burger');
  const panel = document.querySelector('.bv-mob-panel');
  const scrim = document.querySelector('[data-bv-mob-scrim]');
  const closeButton = panel && panel.querySelector('.bv-mob-close');
  if (burger && panel && scrim && closeButton) {

    const setDrawer = (isOpen) => {
      burger.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) {
        panel.hidden = false;
        scrim.hidden = false;
        requestAnimationFrame(() => {
          panel.classList.add('is-open');
          scrim.classList.add('is-open');
        });
        document.documentElement.style.overflow = 'hidden';
      } else {
        panel.classList.remove('is-open');
        scrim.classList.remove('is-open');
        document.documentElement.style.overflow = '';
        setTimeout(() => {
          panel.hidden = true;
          scrim.hidden = true;
        }, 320);
      }
    };

    burger.addEventListener('click', () => setDrawer(burger.getAttribute('aria-expanded') !== 'true'));
    closeButton.addEventListener('click', () => setDrawer(false));
    scrim.addEventListener('click', () => setDrawer(false));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') setDrawer(false);
    });
  }
})();
