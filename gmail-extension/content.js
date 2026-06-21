(() => {
  const processed = new WeakSet();
  let scanTimer = null;

  function clean(value = '') {
    return value.replace(/\s+/g, ' ').trim();
  }

  function escapeHtml(value = '') {
    return value.replace(/[&<>'"]/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[character]);
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
      const parts = clean(row.innerText.replace(/Learn more/g, '')).split(' - ');
      subject = clean(parts[0] || row.innerText || '');
      snippet = clean(parts.slice(1).join(' - '));
    }

    return { sender, subject, snippet };
  }

  function looksLikeEmailRow(row) {
    if (!(row instanceof HTMLElement)) return false;
    if (row.dataset.safecircleScanned === 'true') return false;
    return Boolean(row.querySelector('[email], [data-hovercard-id*="@"], .bog, .y2, [data-thread-id]'));
  }

  function isLikelyScam(result) {
    return result.level === 'red';
  }

  function nextStepsFor(result) {
    if (isLikelyScam(result)) {
      return [
        'Do not click links, open attachments, reply, or send money.',
        'Contact the person or company using a phone number or website you already trust.',
        'Never share a password, PIN, payment information, or verification code.',
        'Report the email as phishing and delete it if the sender cannot be verified.'
      ];
    }

    if (result.level === 'yellow') {
      return [
        'Pause before clicking links or opening attachments.',
        'Check the full sender address for misspellings or unfamiliar domains.',
        'Verify unusual requests through a separate trusted method.',
        'Ask a trusted person for help if you are still unsure.'
      ];
    }

    return [
      'No major warning signs were found in the visible sender, subject, and preview.',
      'Still check the sender address before clicking links or downloading files.',
      'Be cautious if the message asks for money, passwords, or verification codes.'
    ];
  }

  function showDetails(result, data) {
    document.getElementById('safecircle-overlay')?.remove();

    const likelyScam = isLikelyScam(result);
    const nextSteps = nextStepsFor(result);
    const overlay = document.createElement('div');
    overlay.id = 'safecircle-overlay';

    overlay.innerHTML = `
      <section class="safecircle-dialog" role="dialog" aria-modal="true" aria-labelledby="safecircle-question">
        <button class="safecircle-close" aria-label="Close">×</button>

        <h2 id="safecircle-question" class="safecircle-question">Is this a scam?</h2>
        <div class="safecircle-verdict ${likelyScam ? 'yes' : 'no'}">${likelyScam ? 'YES' : 'NO'}</div>
        <p class="safecircle-verdict-note">${
          likelyScam
            ? 'This email is likely a scam or phishing attempt.'
            : result.level === 'yellow'
              ? 'Probably not, but there are warning signs. Be careful.'
              : 'SafeCircle did not find major warning signs in the visible email preview.'
        }</p>

        <button class="safecircle-more" type="button" aria-expanded="false">More...</button>

        <div class="safecircle-more-panel" hidden>
          <p class="safecircle-percentage"><strong>Estimated scam likelihood:</strong> ${result.score}%</p>
          <p><strong>Subject:</strong> ${escapeHtml(data.subject || '(No subject)')}</p>

          <h3>${likelyScam ? 'Why this may be a scam' : 'Why SafeCircle gave this result'}</h3>
          <ul>${result.reasons.map(reason => `<li>${escapeHtml(reason)}</li>`).join('')}</ul>

          <h3>How you should proceed</h3>
          <ol>${nextSteps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>

          <p class="safecircle-note">This percentage is a warning estimate based only on the visible sender, subject, and inbox preview. It is not a guarantee.</p>
        </div>

        <div class="safecircle-actions">
          <button class="safecircle-read">Read this aloud</button>
          <button class="safecircle-dismiss">Close</button>
        </div>
      </section>`;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('.safecircle-close').addEventListener('click', close);
    overlay.querySelector('.safecircle-dismiss').addEventListener('click', close);
    overlay.addEventListener('click', event => {
      if (event.target === overlay) close();
    });

    const moreButton = overlay.querySelector('.safecircle-more');
    const morePanel = overlay.querySelector('.safecircle-more-panel');
    moreButton.addEventListener('click', () => {
      const willOpen = morePanel.hidden;
      morePanel.hidden = !willOpen;
      moreButton.textContent = willOpen ? 'Less' : 'More...';
      moreButton.setAttribute('aria-expanded', String(willOpen));
    });

    overlay.querySelector('.safecircle-read').addEventListener('click', () => {
      speechSynthesis.cancel();
      const message = `Is this a scam? ${likelyScam ? 'Yes' : 'No'}. Estimated scam likelihood ${result.score} percent. ${result.reasons.join(' ')} Recommended next steps. ${nextSteps.join(' ')}`;
      speechSynthesis.speak(new SpeechSynthesisUtterance(message));
    });
  }

  function showOpenWarning(row, result, originalEvent) {
    document.getElementById('safecircle-open-warning')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'safecircle-open-warning';
    overlay.innerHTML = `
      <section class="safecircle-dialog danger" role="alertdialog" aria-modal="true" aria-labelledby="safecircle-warning-title">
        <div class="safecircle-warning-icon">!</div>
        <h2 id="safecircle-warning-title">Are you sure you want to open this email?</h2>
        <p class="safecircle-danger-text">This email is likely a scam or phishing attempt.</p>
        <p>SafeCircle estimated a ${result.score}% scam likelihood based on the visible inbox information.</p>
        <ul>${result.reasons.slice(0, 3).map(reason => `<li>${escapeHtml(reason)}</li>`).join('')}</ul>
        <div class="safecircle-actions">
          <button class="safecircle-back">No, go back</button>
          <button class="safecircle-open-anyway">Yes, open anyway</button>
        </div>
      </section>`;

    document.body.appendChild(overlay);
    overlay.querySelector('.safecircle-back').addEventListener('click', () => overlay.remove());
    overlay.querySelector('.safecircle-open-anyway').addEventListener('click', () => {
      overlay.remove();
      row.dataset.safecircleAllowOpen = 'true';
      const target = originalEvent.target instanceof HTMLElement ? originalEvent.target : row;
      target.click();
      setTimeout(() => delete row.dataset.safecircleAllowOpen, 1200);
    });
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
    button.title = 'See whether SafeCircle thinks this email is a scam';
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

    if (archive?.parentElement === toolbar) archive.insertAdjacentElement('afterend', button);
    else toolbar.appendChild(button);
  }

  function decorateRow(row, result, data) {
    row.dataset.safecircleScanned = 'true';
    row.dataset.safecircleRisk = result.level;
    row.classList.add(`safecircle-row-${result.level}`);

    const ensureButton = () => addLearnMoreButton(row, result, data);
    row.addEventListener('mouseenter', ensureButton);
    row.addEventListener('focusin', ensureButton);
    ensureButton();

    if (isLikelyScam(result)) {
      row.addEventListener('click', event => {
        if (row.dataset.safecircleAllowOpen === 'true') return;
        if (event.target.closest('.safecircle-learn-more')) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        showOpenWarning(row, result, event);
      }, true);
    }
  }

  async function updateStats(level) {
    const current = await chrome.storage.local.get({ scanned: 0, yellow: 0, red: 0 });
    const next = { scanned: current.scanned + 1, yellow: current.yellow, red: current.red };
    if (level === 'yellow') next.yellow += 1;
    if (level === 'red') next.red += 1;
    await chrome.storage.local.set(next);
  }

  function scanInbox() {
    document.querySelectorAll('tr').forEach(row => {
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