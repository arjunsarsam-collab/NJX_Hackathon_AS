(() => {
  const COLORS = {
    green: 'rgba(52, 168, 83, 0.055)',
    yellow: 'rgba(251, 188, 4, 0.085)',
    red: 'rgba(234, 67, 53, 0.075)'
  };

  function restoreHighlights() {
    document.querySelectorAll('tr[data-safecircle-risk]').forEach(row => {
      const level = row.dataset.safecircleRisk;
      if (!COLORS[level]) return;

      row.classList.remove('safecircle-row-green', 'safecircle-row-yellow', 'safecircle-row-red');
      row.classList.add(`safecircle-row-${level}`);

      row.querySelectorAll(':scope > td').forEach(cell => {
        cell.style.setProperty('background-color', COLORS[level], 'important');
      });
    });
  }

  const observer = new MutationObserver(() => restoreHighlights());
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  });

  setInterval(restoreHighlights, 750);
  restoreHighlights();
})();