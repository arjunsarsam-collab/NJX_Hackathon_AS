(() => {
  const processed = new WeakSet();
  let scanTimer = null;

  function clean(value = '') {
    return value.replace(/\s+/g, ' ').trim();
  }

  function getRowData(row) {
    const senderEl = row.querySelector('[email], [data-hovercard-id*="@"]');
    const sender = clean(
      senderEl?.getAttribute('email') ||
      senderEl?.getAttribute('data-hovercard-id') ||
      senderEl?.textContent ||
      ''
    );

    const subjectEl = row.querySelector('.bog, [data-thread-id] .bog, span[id]');
    const snippetEl = row.querySelector('.y2, .y6, [data-thread-id] span:last-child');

    let subject = clean(subjectEl?.textContent || '');
    let snippet = clean(snippetEl?.textContent || '');

    if (!subject || subject.length < 2) {
      const parts = clean(row.innerText).split(' - ');
      subject = clean(parts[0] || row.innerText || '');
      snippet = clean(parts.slice(1).join(' - '));
    }

    return { sender, subject, snippet };
  }

  function looksLikeEmailRow(row) {
    if (!(row instanceof HTMLElement)) return false;
    if (row.dataset.safecircleScanned === 'true') return false;
    const hasSender = Boolean(row.querySelector('[email], [data-hovercard-id*="@"]'));
    const hasSubject = Boolean(row.querySelector('.bog, .y2, [data-thread-id]'));
    return hasSender || hasSubject;
  }

  function labelFor(level) {
    if (level === 'red') return 'High risk';
    if (level === 'yellow') return 'Be careful';
    return 'Looks okay';
  }

  function nextStepsFor(level) {
    if (level === 'red') {
      return [
        'Do not click links, download files, or reply yet.',
        'Contact the person or company using a phone number or website you already trust.',
        'Never share a password, PIN, payment information, or verification code.',
        'Delete or report the message if the sender cannot be verified.'
      ];
    }

    if (level === 'yellow') {
      return [
        'Pause before clicking links or opening attachments.',
        'Check the sender address carefully for misspellings or unfamiliar domains.',
        'Verify the request through a separate trusted method before responding.',
        'Ask a trusted person if you are still unsure.'
      ];
    }

    return [
      'No major warning signs were found in the visible inbox text.',
      'Still check the full sender address before clicking links or downloading files.',
      'Be cautious if the message asks for money, passwords, or verification codes.'
    ];
  }

  function showDetails(result, data) {
    document.getElementById('safecircle-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'safecircle-overlay';
    const nextSteps = nextStepsFor(result.level);

    overlay.innerHTML = `
      <section class="safecircle-dialog" role="dialog" aria-modal="true" aria-labelledby="safecircle-title">
        <button class="safecircle-close" aria-label="Close">×</button>
        <div class="safecircle-shield ${result.level}">${result.level === 'green' ? '✓' : '!'}</div>
        <h2 id="safecircle-title">${labelFor(result.level)}</h2>
        <p class="safecircle-plain-summary">${
          result.level === 'red'
            ? 'This email has several signs commonly used in phishing scams.'
            : result.level === 'yellow'
              ? 'This email has some warning signs. Take a moment to verify it before acting.'
              : 'The visible sender, subject, and preview do not show major phishing warning signs.'
        }</p>
        <p class="safecircle-score">Risk score: ${result.score}/100</p>
        <p><strong>Subject:</strong> ${escapeHtml(data.subject || '(No subject)')}</p>
        <h3>Why this email received this rating</h3>
        <ul>${result.reasons.map(reason => `<li>${escapeHtml(reason)}</li>`).join('')}</ul>
        <h3>Recommended next steps</h3>
        <ol>${nextSteps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
        <div class="safecircle-actions">
          <button class="safecircle-read">Read this aloud</button>
          <button class="safecircle-dismiss">Close</button>
        </div>
        <p class="safecircle-note">SafeCircle provides guidance, not a guarantee. Verify important requests using contact information you find independently.</p>
      </section>`;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('.safecircle-close').addEventListener('click', close);
    overlay.querySelector('.safecircle-dismiss').addEventListener('click', close);
    overlay.addEventListener('click', event => {
      if (event.target === overlay) close();
    });

    overlay.querySelector('.safecircle-read').addEventListener('click', () => {
      speechSynthesis.cancel();
      const message = `${labelFor(result.level)}. ${result.reasons.join(' ')} Recommended next steps. ${nextSteps.join(' ')}`;
      speechSynthesis.speak(new SpeechSynthesisUtterance(message));
    });
  }

  function showOpenWarning(row, result, data, originalEvent) {
    document.getElementById('safecircle-open-warning')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'safecircle-open-warning';
    overlay.innerHTML = `
      <section class="safecircle-dialog danger" role="alertdialog" aria-modal="true">
        <div class="safecircle-shield red">!</div>
        <h2>This email may be dangerous</h2>
        <p>SafeCircle found several phishing warning signs before you opened it.</p>
        <ul>${result.reasons.slice(0, 3).map(reason => `<li>${escapeHtml(reason)}</li>`).join('')}</ul>
        <div class="safecircle-actions">
          <button class="safecircle-back">Go back</button>
          <button class="safecircle-open-anyway">Open anyway</button>
        </div>
      </section>`;

    document.body.appendChild(overlay);
    overlay.querySelector('.safecircle-back').addEventListener('click', () => overlay.remove());
    overlay.querySelector('.safecircle-open-anyway').addEventListener('click', () => {
      overlay.remove();
      row.dataset.safecircleAllowOpen = 'true';
      const target = originalEvent.target instanceof HTMLElement ? originalEvent.target : row;
      target.click();
      setTimeout(() => delete row.dataset.safecircleAllowOpen, 1000);
    });
  }

  function escapeHtml(value = '') {
    return value.replace(/[&<>'"]/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    })[character]);
  }

  function findHoverActions(row) {
    const archive = row.querySelector(
      '[data-tooltip="Archive"], [aria-label="Archive"], [aria-label^="Archive"], [title="Archive"]'
    );
    if (archive) return archive.parentElement;

    const likelyToolbar = [...row.querySelectorAll('td, div')].find(element => {
      const controls = element.querySelectorAll('[role="button"], button');
      return controls.length >= 2 && controls.length <= 8;
    });
    return likelyToolbar || row.querySelector('td:last-child') || row;
  }

  function addLearnMoreButton(row, result, data) {
    if (row.querySelector('.safecircle-learn-more')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = `safecircle-learn-more ${result.level}`;
    button.textContent = 'Learn more';
    button.setAttribute('aria-label', `Learn more about this email's ${labelFor(result.level).toLowerCase()} rating`);
    button.title = 'Why SafeCircle gave this email this rating';
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      showDetails(result, data);
    }, true);

    const toolbar = findHoverActions(row);
    const archive = toolbar?.querySelector?.(
      '[data-tooltip="Archive"], [aria-label="Archive"], [aria-label^="Archive"], [title="Archive"]'
    );

    if (archive?.parentElement === toolbar) {
      archive.insertAdjacentElement('afterend', button);
    } else {
      toolbar.appendChild(button);
    }
  }

  function decorateRow(row, result, data) {
    row.dataset.safecircleScanned = 'true';
    row.dataset.safecircleRisk = result.level;
    row.classList.add(`safecircle-row-${result.level}`);

    const ensureButton = () => addLearnMoreButton(row, result, data);
    row.addEventListener('mouseenter', ensureButton);
    row.addEventListener('focusin', ensureButton);
    ensureButton();

    if (result.level === 'red') {
      row.addEventListener('click', event => {
        if (row.dataset.safecircleAllowOpen === 'true') return;
        if (event.target.closest('.safecircle-learn-more')) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        showOpenWarning(row, result, data, event);
      }, true);
    }
  }

  async function updateStats(level) {
    const current = await chrome.storage.local.get({ scanned: 0, yellow: 0, red: 0 });
    const next = {
      scanned: current.scanned + 1,
      yellow: current.yellow,
      red: current.red
    };
    if (level === 'yellow') next.yellow += 1;
    if (level === 'red') next.red += 1;
    await chrome.storage.local.set(next);
  }

  function scanInbox() {
    const rows = document.querySelectorAll('tr');
    rows.forEach(row => {
      if (!looksLikeEmailRow(row) || processed.has(row)) return;
      processed.add(row);
      const data = getRowData(row);
      if (!data.subject && !data.snippet && !data.sender) return;
      const result = window.SafeCircleScoring.scoreMessage(data);
      decorateRow(row, result, data);
      updateStats(result.level).catch(() => {});
    });
  }

  const observer = new MutationObserver(() => {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scanInbox, 350);
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  scanInbox();
})();