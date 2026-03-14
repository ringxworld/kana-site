browser.contextMenus.create({
  id: 'kotoba-capture',
  title: 'Add to Kana',
  contexts: ['selection'],
});

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'kotoba-capture') return;

  const text = info.selectionText?.trim();
  if (!text) return;

  await browser.storage.session.set({ pendingText: text });
  await browser.action.openPopup();
});
