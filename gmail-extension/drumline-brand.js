(() => {
  function applyDrumLineBranding(root = document) {
    const elements = root.querySelectorAll?.(
      '.safecircle-product-bar span, .safecircle-more-panel h3, .safecircle-note, .safecircle-danger-text'
    ) || [];

    elements.forEach(element => {
      element.textContent = element.textContent
        .replaceAll('CyberShield Security', 'DrumLine Security')
        .replaceAll('CyberShield', 'DrumLine');
    });

    const learnMoreButtons = root.querySelectorAll?.('.safecircle-learn-more') || [];
    learnMoreButtons.forEach(button => {
      if (button.title.includes('CyberShield')) {
        button.title = button.title.replaceAll('CyberShield', 'DrumLine');
      }
    });
  }

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        applyDrumLineBranding(node);
      }
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  applyDrumLineBranding();
})();