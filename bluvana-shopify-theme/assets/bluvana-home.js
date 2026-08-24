(() => {
  window.__bvReady = true;
  const scope = document.querySelector('[data-bv]');
  if (!scope) return;

  /* ---------- reveals ---------- */
  const items = scope.querySelectorAll('[data-bv-rise]');
  if (items.length) {
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      items.forEach((el) => el.classList.add('is-in'));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-in');
              io.unobserve(entry.target);
            }
          });
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
      );
      items.forEach((el) => io.observe(el));
    }
  }

  /* ---------- play section videos only while visible ---------- */
  const sectionVideos = scope.querySelectorAll('.bv-feature-video, .bv-film-video');
  if (sectionVideos.length && 'IntersectionObserver' in window) {
    const vio = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          if (entry.isIntersecting) video.play().catch(() => {});
          else video.pause();
        });
      },
      { threshold: 0.12 }
    );
    sectionVideos.forEach((video) => vio.observe(video));
  }

  /* ---------- hero carousel ---------- */
  const carousel = scope.querySelector('[data-bv-carousel]');
  if (!carousel) return;
  const slides = [...carousel.querySelectorAll('[data-bv-slide]')];
  const dots = [...carousel.querySelectorAll('[data-bv-dot]')];
  const prev = carousel.querySelector('[data-bv-prev]');
  const next = carousel.querySelector('[data-bv-next]');
  let index = 0;
  let timer = null;

  const show = (n) => {
    index = (n + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      const active = i === index;
      slide.classList.toggle('is-active', active);
      if (active) slide.removeAttribute('hidden');
      else slide.setAttribute('hidden', '');
      const video = slide.querySelector('video');
      if (video) {
        if (active) video.play().catch(() => {});
        else video.pause();
      }
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === index);
      dot.setAttribute('aria-selected', String(i === index));
    });
  };

  const stopAuto = () => {
    clearInterval(timer);
    timer = null;
  };

  const startAuto = () => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timer = setInterval(() => show(index + 1), 8000);
  };

  prev.addEventListener('click', () => {
    stopAuto();
    show(index - 1);
  });
  next.addEventListener('click', () => {
    stopAuto();
    show(index + 1);
  });
  dots.forEach((dot, i) =>
    dot.addEventListener('click', () => {
      stopAuto();
      show(i);
    })
  );

  show(0);
  startAuto();
})();
