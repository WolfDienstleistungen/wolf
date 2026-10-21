'use strict';
(() => {
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#hauptnavigation');
  function setMenu(open) {
    nav?.classList.toggle('open', open);
    menu?.setAttribute('aria-expanded', String(open));
    menu?.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
  }
  menu?.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
  nav?.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') { setMenu(false); menu.focus(); } });
  document.addEventListener('click', e => { if (!e.target.closest('.site-header')) setMenu(false); });
  window.matchMedia('(min-width: 701px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

  const back = document.querySelector('.back-top');
  function updateBack() { back?.classList.toggle('visible', window.scrollY > 650); }
  window.addEventListener('scroll', updateBack, {passive: true});
  updateBack();
  back?.addEventListener('click', () => window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}));

  document.querySelectorAll('[data-filter]').forEach(button => {
    button.addEventListener('click', () => {
      const group = button.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      let count = 0;
      document.querySelectorAll('.filter-grid > [data-category]').forEach(card => {
        const visible = group === 'Alle Leistungen' || card.dataset.category === group;
        card.hidden = !visible;
        if (visible) count++;
      });
      document.querySelectorAll('.filter-status').forEach(status => { status.textContent = status.dataset.resultLabel === "Fotos" ? "Fotoauswahl aktualisiert." : `${count} ${status.dataset.resultLabel || "Ergebnisse"} werden angezeigt.`; });
    });
  });

  const serviceNames = {
    'abbruch':'Abbruch', 'tiefbau':'Tiefbau', 'baggerfahrer-vermietung':'Baggerfahrer-Vermietung',
    'garten-landschaftsbau':'Garten- und Landschaftsbau', 'wasser-gas-kanal':'Wasser-, Gas- & Kanalanschlüsse',
    'asphaltarbeiten':'Asphaltarbeiten', 'eichenprozessionsspinner':'Eichenprozessionsspinner beseitigen', 'gruenpflege':'Grünpflege', 'betonarbeiten':'Betonarbeiten', 'natursteinmauern':'Natursteinmauern'
  };
  const chosen = new URLSearchParams(window.location.search).get('leistung');
  document.querySelectorAll('[data-contact-form]').forEach(form => {
    if (chosen && serviceNames[chosen]) form.elements.service.value = serviceNames[chosen];
    const recipient = 'info@wolf-landschaftspflege.de';
    const result = form.querySelector('.form-result');
    const fallback = result.querySelector('.form-fallback');
    const submitButton = form.querySelector('button[type="submit"]');
    const initialButtonHTML = submitButton.innerHTML;
    let messageText = '';
    let sending = false;

    const showResult = (state, text) => {
      result.hidden = false;
      result.dataset.state = state;
      result.querySelector('p').textContent = text;
      fallback.hidden = state !== 'error';
    };

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (sending || !form.reportValidity()) return;
      const data = new FormData(form);
      const get = key => String(data.get(key) || '').trim();
      if (get('_honey')) return; // Spam trap; never submit the hidden field if it is filled.

      messageText = `Guten Tag WOLF Dienstleistungen,\n\nich möchte folgendes Projekt anfragen.\n\nName: ${get('name')}\nE-Mail: ${get('email')}\nTelefon: ${get('phone') || 'nicht angegeben'}\nLeistung: ${get('service')}\nOrt: ${get('location') || 'noch offen'}\n\n${get('message')}\n\nFreundliche Grüße\n${get('name')}`;
      const subject = `Projektanfrage: ${get('service')} – ${get('name')}`;
      form.querySelector('.whatsapp-message').href = 'https://wa.me/4915118172739?text=' + encodeURIComponent(messageText);
      form.querySelector('.email-message').href = 'mailto:' + recipient + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(messageText);

      if (window.location.protocol === 'file:') {
        showResult('error', 'Der direkte Formularversand funktioniert erst, wenn die Website online über HTTPS erreichbar ist. Bis dahin können Sie die Anfrage per E-Mail öffnen oder kopieren.');
        return;
      }

      sending = true;
      submitButton.disabled = true;
      submitButton.textContent = 'Wird gesendet …';
      showResult('pending', 'Ihre Anfrage wird gerade gesendet …');

      try {
        const response = await fetch('https://formsubmit.co/ajax/' + recipient, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            name: get('name'),
            email: get('email'),
            phone: get('phone'),
            service: get('service'),
            location: get('location'),
            message: get('message'),
            _subject: subject,
            _replyto: get('email'),
            _template: 'table',
            _honey: ''
          })
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const answer = await response.json();
        // FormSubmit returns the string "false" for some failed requests with HTTP 200.
        if (answer.success !== true && answer.success !== 'true') {
          if (/activat|bestätig|confirm/i.test(String(answer.message || ''))) {
            showResult('error', 'Der Empfang muss zuerst über eine Aktivierungs-E-Mail an ' + recipient + ' bestätigt werden. Bis zur Aktivierung ist die Zustellung nicht bestätigt. Bitte wenden Sie sich andernfalls direkt per E-Mail an uns.');
          } else {
            showResult('error', 'Die Anfrage konnte leider nicht gesendet werden. Bitte versuchen Sie es erneut oder nutzen Sie die E-Mail-Alternative.');
          }
          return;
        }
        form.reset();
        showResult('success', 'Vielen Dank! Der Versanddienst hat Ihre Anfrage angenommen. Wir melden uns schnellstmöglich bei Ihnen.');
      } catch {
        showResult('error', 'Die Anfrage konnte nicht übermittelt werden. Bitte prüfen Sie Ihre Internetverbindung oder senden Sie die vorbereitete Nachricht über Ihre E-Mail-App.');
      } finally {
        sending = false;
        submitButton.disabled = false;
        submitButton.innerHTML = initialButtonHTML;
      }
    });

    form.querySelector('.copy-message')?.addEventListener('click', async () => {
      const status = result.querySelector('p');
      try {
        if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(messageText);
        else {
          const area = document.createElement('textarea');
          area.value = messageText; area.setAttribute('readonly', '');
          area.style.position = 'fixed'; area.style.left = '-9999px';
          document.body.append(area); area.select();
          const copied = document.execCommand('copy'); area.remove();
          if (!copied) throw new Error('copy failed');
        }
        status.textContent = 'Nachricht kopiert. Fügen Sie sie in eine E-Mail an ' + recipient + ' ein und senden Sie sie dort ab.';
      } catch {
        status.textContent = 'Automatisches Kopieren ist hier nicht möglich. Sie können diesen Text manuell kopieren:';
        let manual = form.querySelector('.manual-copy');
        if (!manual) { manual = document.createElement('textarea'); manual.className = 'manual-copy'; manual.setAttribute('aria-label', 'Nachricht zum Kopieren'); manual.rows = 8; result.append(manual); }
        manual.value = messageText; manual.focus(); manual.select();
      }
    });
    form.addEventListener('input', () => { if (!sending) result.hidden = true; });
    form.addEventListener('change', () => { if (!sending) result.hidden = true; });
  });

  const dialog = document.querySelector('.gallery-dialog');
  let opener = null;
  if (dialog) {
    document.querySelectorAll('.gallery-open').forEach(button => button.addEventListener('click', () => {
      opener=button;
      const thumbnail = button.querySelector('img.project-photo, svg.crop-photo');
      if (!thumbnail) return;
      const picture = thumbnail.cloneNode(true);
      if (picture.tagName.toLowerCase() === 'img') {
        picture.src = button.dataset.full || thumbnail.src;
        picture.loading = 'eager';
        picture.decoding = 'async';
      }
      dialog.querySelector('.dialog-image').replaceChildren(picture);
      dialog.querySelector('#gallery-title').textContent=button.dataset.galleryTitle;
      dialog.querySelector('.dialog-link').href=button.dataset.galleryLink;
      if (typeof dialog.showModal === 'function') { dialog.showModal(); document.body.style.overflow='hidden'; }
      else window.location.href=button.dataset.galleryLink;
    }));
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if (e.target===dialog) { const r=dialog.getBoundingClientRect(); if(e.clientX<r.left || e.clientX>r.right || e.clientY<r.top || e.clientY>r.bottom) dialog.close(); } });
    dialog.addEventListener('close', () => { document.body.style.overflow=''; opener?.focus(); });
  }
})();
