(() => {
  const processed = new WeakSet();
  let scanTimer = null;

  function clean(value = '') {
    return value.replace(/\s+/g, ' ').trim();
  }

  function getRowData(row) {
    const senderEl = row.querySelector('[email], [data-hovercard-id*="@"]');
    const sender = clean(senderEl?.getAttribute('email') || senderEl?.getAttribute('data-hovercard-id') || senderEl?.textContent || '');

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

  function showDetails(result, data) {
    document.getElementById('safecircle-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'safecircle-overlay';
    overlay.innerHTML = `
      <section class="safecircle-dialog" role="dialog" aria-modal="true" aria-labelledby="safecircle-title">
        <button class="safecircle-close" aria-label="Close">×</button>
        <div class="safecircle-shield ${result.level}">${result.level === 'red' ? '!' : result.level === 'yellow' ? '!' : '✓'}</div>
        <h2 id="safecircle-title">${labelFor(result.level)}</h2>
        <p class="safecircle-score">Risk score: ${result.score}/100</p>
        <p><strong>Subject:</strong> ${escapeHtml(data.subject || '(No subject)')}</p>
        <h3>Why SafeCircle chose this warning</h3>
        <ul>${result.reasons.map(reason => `<li>${escapeHtml(reason)}</li>`).join('')}</ul>
        <div class="safecircle-actions">
          <button class="safecircle-read">Read warning aloud</button>
          <button class="safecircle-dismiss">Close</button>
        </div>
        <p class="safecircle-note">This is guidance, not a guarantee. Verify the sender using contact information you already trust.</p>
      </section>`;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('.safecircle-close').addEventListener('click', close);
    overlay.querySelector('.safecircle-dismiss').addEventListener('click', close);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    overlay.querySelector('.safecircle-read').addEventListener('click', () => {
      speechSynthesis.cancel();
      const message = `${labelFor(result.level)}. ${result.reasons.join(' ')} Do not click links or download files until you verify the sender.`;
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
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[character]);
  }

  function addBadge(row, result, data) {
    row.dataset.safecircleScanned = 'true';
    row.classList.add(`safecircle-row-${result.level}`);

    const badge = document.createElement('button');
    badge.type = 'button';
    badge.className = `safecircle-badge ${result.level}`;
    badge.textContent = result.level === 'red' ? '🔴 High risk' : result.level === 'yellow' ? '🟡 Caution' : '🟢 Safe';
    badge.title = `SafeCircle risk score ${result.score} out of 100`;
    badge.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      showDetails(result, data);
    });

    const firstCell = row.querySelector('td') || row;
    firstCell.prepend(badge);

    if (result.level === 'red') {
      row.addEventListener('click', event => {
        if (row.dataset.safecircleAllowOpen === 'true') return;
        if (event.target.closest('.safecircle-badge')) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        showOpenWarning(row, result, data, event);
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
    const rows = document.querySelectorAll('tr');
    rows.forEach(row => {
      if (!looksLikeEmailRow(row) || processed.has(row)) return;
      processed.add(row);
      const data = getRowData(row);
      if (!data.subject && !data.snippet && !data.sender) return;
      const result = window.SafeCircleScoring.scoreMessage(data);
      addBadge(row, result, data);
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