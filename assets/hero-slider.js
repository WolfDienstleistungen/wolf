/* WOLF hero carousel: 3 slides, 4,000 ms per slide. No external dependencies. */
(function (global) {
  'use strict';

  function createClock(options) {
    const duration = options.duration || 4000;
    const now = options.now || (() => global.performance.now());
    const requestFrame = options.requestFrame || (callback => global.requestAnimationFrame(callback));
    const cancelFrame = options.cancelFrame || (id => global.cancelAnimationFrame(id));
    const progress = options.progress || (() => {});
    let elapsed = 0, last = 0, frame = null, running = false;
    function tick() {
      if (!running) return;
      const time = now();
      elapsed += Math.max(0, time - last);
      last = time;
      if (elapsed >= duration) {
        elapsed = 0;
        options.advance();
      }
      progress(Math.min(1, elapsed / duration));
      if (running) frame = requestFrame(tick);
    }
    return {
      get running() { return running; },
      start() {
        if (running) return;
        running = true; last = now(); frame = requestFrame(tick);
      },
      pause() {
        if (!running) return;
        elapsed += Math.max(0, now() - last);
        running = false; cancelFrame(frame); frame = null;
        progress(Math.min(1, elapsed / duration));
      },
      reset() { elapsed = 0; last = now(); progress(0); },
      destroy() { running = false; cancelFrame(frame); frame = null; }
    };
  }

  function init(root) {
    const slides = Array.from(root.querySelectorAll('[data-hero-slide]'));
    const buttons = Array.from(root.querySelectorAll('[data-hero-go]'));
    if (slides.length < 2) return;
    const motion = global.matchMedia('(prefers-reduced-motion: reduce)');
    const pauseButton = root.querySelector('[data-hero-pause]');
    const status = root.querySelector('[data-hero-status]');
    const duration = Math.max(1000, Number(root.dataset.interval) || 4000);
    let index = 0, userPaused = motion.matches, visible = true;
    let touchStart = null;

    function show(next, announce) {
      index = (next + slides.length) % slides.length;
      slides.forEach((slide, n) => {
        const active = n === index;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', String(!active));
        slide.inert = !active;
      });
      buttons.forEach((button, n) => {
        const active = n === index;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
        button.querySelector('.hero-tab-fill').style.transform = 'scaleX(0)';
      });
      root.dataset.activeSlide = String(index + 1);
      const counter = root.querySelector('[data-hero-counter]');
      if (counter) counter.textContent = String(index + 1).padStart(2, '0');
      if (announce && status) status.textContent = slides[index].getAttribute('aria-label');
    }

    const clock = createClock({
      duration,
      advance: () => show(index + 1, false),
      progress: fraction => {
        buttons[index].querySelector('.hero-tab-fill').style.transform = `scaleX(${fraction})`;
      }
    });

    function sync() {
      if (userPaused || global.document.hidden || !visible) clock.pause();
      else clock.start();
      root.classList.toggle('is-running', clock.running);
      root.classList.toggle('is-paused', userPaused);
      pauseButton.setAttribute('aria-pressed', String(userPaused));
      pauseButton.setAttribute('aria-label', userPaused ? 'Automatischen Bildwechsel starten' : 'Automatischen Bildwechsel pausieren');
    }
    function go(next) { show(next, true); clock.reset(); sync(); }
    buttons.forEach(button => button.addEventListener('click', () => go(Number(button.dataset.heroGo))));
    root.querySelector('[data-hero-prev]').addEventListener('click', () => go(index - 1));
    root.querySelector('[data-hero-next]').addEventListener('click', () => go(index + 1));
    pauseButton.addEventListener('click', () => { userPaused = !userPaused; sync(); });

    root.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
      if (event.key === 'ArrowLeft') { event.preventDefault(); go(index - 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); go(index + 1); }
    });
    root.addEventListener('focusin', event => {
      if (event.target.matches(':focus-visible') && !event.target.closest('.hero-controls')) {
        userPaused = true; sync();
      }
    });
    root.addEventListener('touchstart', event => {
      if (event.touches.length === 1 && !event.target.closest('a,button')) {
        touchStart = {x:event.touches[0].clientX, y:event.touches[0].clientY};
      } else touchStart = null;
    }, {passive:true});
    root.addEventListener('touchend', event => {
      if (!touchStart || !event.changedTouches.length) return;
      const dx = event.changedTouches[0].clientX - touchStart.x;
      const dy = event.changedTouches[0].clientY - touchStart.y;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) go(index + (dx < 0 ? 1 : -1));
      touchStart = null;
    }, {passive:true});
    root.addEventListener('touchcancel', () => { touchStart = null; }, {passive:true});
    global.document.addEventListener('visibilitychange', sync);
    global.addEventListener('pagehide', () => clock.pause());
    global.addEventListener('pageshow', sync);
    motion.addEventListener('change', event => { userPaused = event.matches; sync(); });
    if ('IntersectionObserver' in global) {
      const observer = new global.IntersectionObserver(entries => {
        visible = entries[0].isIntersecting; sync();
      }, {threshold:0});
      observer.observe(root);
    }
    show(0, false);
    sync();
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = {createClock, init};
  if (global.document) global.document.querySelectorAll('[data-hero-slider]').forEach(init);
})(typeof window !== 'undefined' ? window : globalThis);
