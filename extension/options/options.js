const input = document.getElementById('api-key');
const status = document.getElementById('status');

browser.storage.sync.get('kotoba_api_key').then(({ kotoba_api_key }) => {
  if (kotoba_api_key) input.value = kotoba_api_key;
});

document.getElementById('save-btn').onclick = async () => {
  const key = input.value.trim();
  await browser.storage.sync.set({ kotoba_api_key: key });
  status.textContent = key ? 'Saved.' : 'Cleared.';
  setTimeout(() => { status.textContent = ''; }, 2000);
};
