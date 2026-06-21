(() => {
  function polishVerdict(root = document) {
    const dialog = root.querySelector?.('.safecircle-verdict-dialog');
    if (!dialog) return;

    const question = dialog.querySelector('.safecircle-question');
    const verdict = dialog.querySelector('.safecircle-verdict');
    const infoButton = dialog.querySelector('.safecircle-more');

    if (question) question.textContent = 'Is this a scam?';
    if (verdict) verdict.textContent = verdict.classList.contains('yes') ? 'YES' : 'NO';
    if (infoButton && infoButton.getAttribute('aria-expanded') !== 'true') {
      infoButton.textContent = 'More information';
    }
  }

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.matches?.('#safecircle-overlay, .safecircle-verdict-dialog') || node.querySelector?.('.safecircle-verdict-dialog')) {
          polishVerdict(node.matches?.('.safecircle-verdict-dialog') ? node.parentElement : node);
        }
      }
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  polishVerdict();
})();