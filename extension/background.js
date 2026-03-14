browser.contextMenus.create({
  id: 'kana-capture',
  title: 'Add to Kana',
  contexts: ['selection'],
});

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'kana-capture') return;

  const text = info.selectionText?.trim();
  if (!text) return;

  await browser.storage.session.set({ pendingText: text });
  await browser.action.openPopup();
});
