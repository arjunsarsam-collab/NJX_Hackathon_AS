async function refresh() {
  const stats = await chrome.storage.local.get({ scanned: 0, yellow: 0, red: 0 });
  document.getElementById('scanned').textContent = stats.scanned;
  document.getElementById('yellow').textContent = stats.yellow;
  document.getElementById('red').textContent = stats.red;
}

document.getElementById('reset').addEventListener('click', async () => {
  await chrome.storage.local.set({ scanned: 0, yellow: 0, red: 0 });
  refresh();
});

refresh();