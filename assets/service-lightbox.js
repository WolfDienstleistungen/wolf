/* Einheitliche Fotogalerie mit Vor/Zurück: Leistungsseiten und Einblicke. */
(() => {
  'use strict';
  const allPictures = [...document.querySelectorAll('.detail-showcase-grid .service-image-open, .gallery-grid .gallery-open')];
  if (!allPictures.length || !('HTMLDialogElement' in window)) return;
  const isEinblicke = !!document.querySelector('.gallery-grid .gallery-open');
  function currentPictures() {
    // Nach dem Filtern durchläuft der Betrachter nur die sichtbaren Fotos.
    return allPictures.filter(button => !button.closest('.gallery-card')?.hidden);
  }

  const dialog = document.createElement('dialog');
  dialog.className = 'service-photo-dialog';
  dialog.setAttribute('aria-label', 'Fotogalerie');
  dialog.innerHTML = `
    <div class="service-photo-shell">
      <div class="service-photo-stage">
        <img class="service-photo-image" alt="" draggable="false">
        <button class="service-photo-nav service-photo-prev" type="button" aria-label="Vorheriges Bild">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <button class="service-photo-nav service-photo-next" type="button" aria-label="Nächstes Bild">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
      <button class="service-photo-close" type="button" aria-label="Galerie schließen" autofocus>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M5 5 19 19M19 5 5 19"/></svg>
      </button>
      <div class="service-photo-footer">
        <span class="service-photo-caption"></span>
        <span class="service-photo-counter" aria-live="polite"></span>
      </div>
    </div>`;
  document.body.appendChild(dialog);

  const image = dialog.querySelector('.service-photo-image');
  const caption = dialog.querySelector('.service-photo-caption');
  const counter = dialog.querySelector('.service-photo-counter');
  const previous = dialog.querySelector('.service-photo-prev');
  const next = dialog.querySelector('.service-photo-next');
  const closeButton = dialog.querySelector('.service-photo-close');
  let selected = 0;
  let opener = null;
  let oldOverflow = '';
  let pointerStart = null;

  function source(index, pictures) {
    return pictures[index].dataset.full;
  }
  function render(index) {
    const pictures = currentPictures();
    if (!pictures.length) return;
    selected = (index + pictures.length) % pictures.length;
    const button = pictures[selected];
    const smallImage = button.querySelector('img');
    const description = button.dataset.galleryTitle ||
      (isEinblicke ? '' : button.querySelector('span')?.textContent?.trim()) || smallImage?.alt || '';
    image.alt = description;
    image.src = source(selected, pictures);
    caption.textContent = description;
    counter.textContent = isEinblicke ? '' : `${selected + 1} / ${pictures.length}`;
    counter.hidden = isEinblicke;
    const moreThanOne = pictures.length > 1;
    previous.hidden = !moreThanOne;
    next.hidden = !moreThanOne;
    // Nur die direkt benachbarten Bilder vorladen.
    if (moreThanOne) {
      [selected - 1, selected + 1].forEach(i => {
        const preloaded = new Image();
        preloaded.src = source((i + pictures.length) % pictures.length, pictures);
      });
    }
  }
  function move(direction) { render(selected + direction); }

  allPictures.forEach(button => {
    button.addEventListener('click', () => {
      const index = currentPictures().indexOf(button);
      if (index < 0) return;
      opener = button;
      render(index);
      oldOverflow = document.body.style.overflow;
      dialog.showModal();
      document.body.style.overflow = 'hidden';
    });
  });
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = oldOverflow;
    opener?.focus({ preventScroll: true });
  });
  const stage = dialog.querySelector('.service-photo-stage');
  stage.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' && !event.target.closest('button')) {
      pointerStart = { x: event.clientX, y: event.clientY };
    }
  });
  stage.addEventListener('pointerup', event => {
    if (!pointerStart) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.25) move(dx < 0 ? 1 : -1);
  });
  stage.addEventListener('pointercancel', () => { pointerStart = null; });
})();
