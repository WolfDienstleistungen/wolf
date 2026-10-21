/*
 * WOLF Dienstleistungen – gradual fade-up, inspired by the BABIN BAU visual rhythm.
 * Native browser scrolling stays untouched; animation changes no layout dimensions.
 * All elements remain visible without JavaScript, IntersectionObserver or WAAPI.
 */
(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || !('IntersectionObserver' in window) ||
      !Element.prototype.animate) return;

  const ease = 'cubic-bezier(.22, 1, .36, 1)';
  let activeAnimations = new Set();

  const animateIn = (element, delay = 0, duration = 850, distance = 30) => {
    if (!element || reduced.matches || element.dataset.wolfRevealed === '1') return;
    element.dataset.wolfRevealed = '1';
    let animation;
    try {
      animation = element.animate([
        { opacity: 0, transform: `translate3d(0, ${distance}px, 0)` },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' }
      ], {
        duration,
        delay,
        easing: ease,
        fill: 'backwards',
        iterations: 1
      });
      activeAnimations.add(animation);
      animation.finished.catch(() => {}).then(() => activeAnimations.delete(animation));
    } catch (_) {
      // Even if animations are unavailable, content remains fully visible.
    }
  };

  /* The hero is independent of scroll. Stagger ONLY when the active slide
     appears (on initial load or after the automatic four-second slide change). */
  const hero = document.querySelector('[data-hero-slider]');
  if (hero) {
    const heroAnimations = new Set();
    const playHero = slide => {
      if (!slide || reduced.matches) return;
      for (const a of heroAnimations) { try { a.cancel(); } catch (_) {} }
      heroAnimations.clear();
      const parts = [
        slide.querySelector('.hero-overline'),
        slide.querySelector('.hero-heading'),
        slide.querySelector('.hero-tagline'),
        slide.querySelector('.hero-desc'),
        slide.querySelector('.hero-copy .button-row')
      ].filter(Boolean);
      parts.forEach((el, index) => {
        try {
          const a = el.animate([
            { opacity: 0, transform: 'translate3d(0, 27px, 0)' },
            { opacity: 1, transform: 'translate3d(0, 0, 0)' }
          ], {
            duration: 850,
            delay: 90 + index * 125,
            easing: ease,
            fill: 'backwards'
          });
          heroAnimations.add(a);
          a.finished.catch(() => {}).then(() => heroAnimations.delete(a));
        } catch (_) {}
      });
    };
    let current = hero.querySelector('.hero-slide.is-active');
    // Animation begins as soon as the page is ready, never on a scroll event.
    window.requestAnimationFrame(() => playHero(current));
    const slideObserver = new MutationObserver(() => {
      const next = hero.querySelector('.hero-slide.is-active');
      if (next && next !== current) {
        current = next;
        playHero(next);
      }
    });
    slideObserver.observe(hero, { subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  const queries = [
    // Homepage headings and staggered service/project cards
    '.section-heading > .eyebrow', '.section-heading > h2',
    '.section-heading > p:not(.eyebrow)',
    '.service-grid > .service-card', '.gallery-row > .gallery-tile',
    '.gallery-grid > .gallery-card', '.process-grid > article',
    // Real customer photos and associated copy
    '.about-picture', '.about-copy > .eyebrow', '.about-copy > h2',
    '.about-copy > p:not(.eyebrow)', '.about-copy .check-list > li',
    '.about-copy > .button',
    // FAQ and call-to-action
    '.home-faq-copy > .eyebrow', '.home-faq-copy > h2',
    '.home-faq-copy > p:not(.eyebrow)', '.home-faq-list > details',
    '.home-cta-copy > h2', '.home-cta-copy > p', '.home-cta-button',
    // Subpages
    '.page-hero .breadcrumbs', '.page-hero .eyebrow',
    '.page-hero h1', '.page-hero .container > p:not(.eyebrow)',
    '.detail-main > h2', '.detail-main > .intro-text',
    '.detail-photo', '.detail-showcase', '.service-sidebar > *',
    '.story-grid > *', '.value-grid > article',
    '.location-grid > *', '.faq-grid > *',
    '.contact-grid > *', '.contact-form',
    '.cta-band .container > *', '.wolf-footer-grid > *'
  ];

  const skip = el => {
    // Avoid all slider/image-progress controls, buttons floating over content,
    // and hidden or modal content. Never animate layout sections as one unit.
    if (el.closest('.hero-slider, .gallery-dialog, [hidden]')) return true;
    if (!el.getBoundingClientRect().width) return true;
    if (el.getClientRects().length === 0) return true;
    return getComputedStyle(el).display === 'none';
  };

  const groupSelectors = '.service-card, .gallery-tile, .gallery-card, .process-grid > article, .value-grid > article, .home-faq-list > details, .wolf-footer-grid > *';
  const delayFor = el => {
    if (!el.matches(groupSelectors)) return 0;
    const siblings = Array.from(el.parentElement.children)
      .filter(child => child.matches(groupSelectors));
    return (siblings.indexOf(el) % 4) * 100;
  };

  const elements = Array.from(new Set(document.querySelectorAll(queries.join(','))))
    .filter(el => !skip(el));

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const element = entry.target;
      observer.unobserve(element);
      animateIn(element, delayFor(element), 850, 30);
    }
  }, { threshold: 0.06, rootMargin: '0px 0px 65px 0px' });

  for (const element of elements) observer.observe(element);

  reduced.addEventListener?.('change', () => {
    if (!reduced.matches) return;
    observer.disconnect();
    for (const animation of activeAnimations) animation.cancel();
    activeAnimations.clear();
  });
})();
