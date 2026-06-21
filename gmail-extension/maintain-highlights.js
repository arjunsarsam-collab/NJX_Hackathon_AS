(() => {
  const COLORS = {
    green: 'rgba(52, 168, 83, 0.055)',
    yellow: 'rgba(251, 188, 4, 0.085)',
    red: 'rgba(234, 67, 53, 0.075)'
  };

  let scheduled = false;

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

    const subjectEl = row.querySelector('.bog, [data-thread-id] .bog');
    const snippetEl = row.querySelector('.y2, .y6');

    return {
      sender,
      subject: clean(subjectEl?.textContent || ''),
      snippet: clean(snippetEl?.textContent || '')
    };
  }

  function isEmailRow(row) {
    if (!(row instanceof HTMLElement)) return false;
    return Boolean(
      row.querySelector('[email], [data-hovercard-id*="@"], .bog, .y2, [data-thread-id]')
    );
  }

  function applyHighlight(row, level) {
    row.dataset.safecircleRisk = level;
    row.classList.remove('safecircle-row-green', 'safecircle-row-yellow', 'safecircle-row-red');
    row.classList.add(`safecircle-row-${level}`);

    row.querySelectorAll(':scope > td').forEach(cell => {
      cell.style.setProperty('background-color', COLORS[level], 'important');
    });
  }

  function refreshRows() {
    scheduled = false;

    document.querySelectorAll('tr').forEach(row => {
      if (!isEmailRow(row)) return;

      let level = row.dataset.safecircleRisk;
      if (!COLORS[level]) {
        const data = getRowData(row);
        if (!data.sender && !data.subject && !data.snippet) return;
        level = window.SafeCircleScoring.scoreMessage(data).level;
      }

      applyHighlight(row, level);
    });
  }

  function scheduleRefresh() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(refreshRows, 300);
  }

  const observer = new MutationObserver(scheduleRefresh);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  setInterval(refreshRows, 2000);
  refreshRows();
})();