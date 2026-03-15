import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POPUP_URL = `file://${path.resolve(__dirname, '../popup/popup.html')}`;

const PENDING_TEXT = '日本語を勉強しています';

const MOCK_ENRICH = {
  original: PENDING_TEXT,
  furigana:
    '<ruby>日本語<rt>にほんご</rt></ruby>を<ruby>勉強<rt>べんきょう</rt></ruby>しています',
  translation: 'I am studying Japanese.',
  translationModel: 'qwen2.5:3b',
  furiganaSource: 'kuroshiro',
};

const MOCK_DECKS = [
  { id: 1, name: 'Core Vocab', description: '', createdAt: 1_000_000 },
  { id: 2, name: 'Grammar', description: '', createdAt: 1_000_001 },
];

const MOCK_CAPTURE = {
  card: {
    id: 42,
    deckId: 1,
    front: PENDING_TEXT,
    back: MOCK_ENRICH.translation,
    createdAt: 1_000_002,
  },
  ...MOCK_ENRICH,
};

test.beforeEach(async ({ page }) => {
  // Inject browser WebExtension API mock before popup.js runs
  await page.addInitScript((text: string) => {
    (window as unknown as Record<string, unknown>)['browser'] = {
      storage: {
        sync: {
          get: (_key: string) => Promise.resolve({ kotoba_api_key: '' }),
        },
        session: {
          get: (_key: string) => Promise.resolve({ pendingText: text }),
          remove: (_key: string) => Promise.resolve(),
        },
      },
    };
    // Prevent window.close() from terminating the page during assertions
    window.close = () => {};
  }, PENDING_TEXT);

  // Mock server calls — popup tries kotoba.local first, falls back to localhost:3001
  for (const base of ['http://kotoba.local', 'http://localhost:3001']) {
    await page.route(`${base}/health`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }),
    );
    await page.route(`${base}/api/v1/sentences/enrich`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ENRICH) }),
    );
    await page.route(`${base}/api/v1/decks`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DECKS) }),
    );
    await page.route(`${base}/api/v1/sentences/capture`, (route) =>
      route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(MOCK_CAPTURE) }),
    );
  }
});

// ── Loading → Result transition ───────────────────────────────────────────────

test('shows loading state then transitions to result', async ({ page }) => {
  await page.goto(POPUP_URL);
  // Loading section must disappear and result must appear
  await expect(page.locator('#result')).not.toHaveClass(/hidden/, { timeout: 5000 });
  await expect(page.locator('#loading')).toHaveClass(/hidden/);
});

// ── Enrich response shape ─────────────────────────────────────────────────────

test('renders original Japanese text', async ({ page }) => {
  await page.goto(POPUP_URL);
  await expect(page.locator('#result')).not.toHaveClass(/hidden/, { timeout: 5000 });
  await expect(page.locator('#original')).toHaveText(PENDING_TEXT);
});

test('renders furigana as ruby elements', async ({ page }) => {
  await page.goto(POPUP_URL);
  await expect(page.locator('#result')).not.toHaveClass(/hidden/, { timeout: 5000 });

  const rubyCount = await page.locator('#furigana ruby').count();
  expect(rubyCount).toBeGreaterThan(0);

  const firstRt = page.locator('#furigana ruby rt').first();
  await expect(firstRt).toHaveText('にほんご');
});

test('renders translation text', async ({ page }) => {
  await page.goto(POPUP_URL);
  await expect(page.locator('#result')).not.toHaveClass(/hidden/, { timeout: 5000 });
  await expect(page.locator('#translation')).toHaveText(MOCK_ENRICH.translation);
});

test('shows model provenance tag', async ({ page }) => {
  await page.goto(POPUP_URL);
  await expect(page.locator('#result')).not.toHaveClass(/hidden/, { timeout: 5000 });
  await expect(page.locator('#model-tag')).toContainText('qwen2.5:3b');
  await expect(page.locator('#model-tag')).toContainText('kuroshiro');
});

// ── Deck picker ───────────────────────────────────────────────────────────────

test('populates deck dropdown with all decks', async ({ page }) => {
  await page.goto(POPUP_URL);
  await expect(page.locator('#result')).not.toHaveClass(/hidden/, { timeout: 5000 });

  const options = page.locator('#deck-select option');
  await expect(options).toHaveCount(MOCK_DECKS.length);
  await expect(options.nth(0)).toHaveText('Core Vocab');
  await expect(options.nth(1)).toHaveText('Grammar');
});

test('save button is enabled when decks are loaded', async ({ page }) => {
  await page.goto(POPUP_URL);
  await expect(page.locator('#result')).not.toHaveClass(/hidden/, { timeout: 5000 });
  await expect(page.locator('#save-btn')).toBeEnabled();
});

// ── Save flow ─────────────────────────────────────────────────────────────────

test('clicking save transitions to done state', async ({ page }) => {
  await page.goto(POPUP_URL);
  await expect(page.locator('#save-btn')).toBeEnabled({ timeout: 5000 });

  await page.locator('#save-btn').click();

  await expect(page.locator('#done')).not.toHaveClass(/hidden/, { timeout: 5000 });
  await expect(page.locator('#done')).toContainText('Card saved');
});

test('save posts correct deckId to /capture', async ({ page }) => {
  let capturedBody: Record<string, unknown> | null = null;

  await page.route('http://kotoba.local/api/v1/sentences/capture', async (route) => {
    capturedBody = JSON.parse(route.request().postData() ?? '{}') as Record<string, unknown>;
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(MOCK_CAPTURE) });
  });

  await page.goto(POPUP_URL);
  await expect(page.locator('#save-btn')).toBeEnabled({ timeout: 5000 });

  // Select the second deck
  await page.locator('#deck-select').selectOption({ index: 1 });
  await page.locator('#save-btn').click();

  await expect(page.locator('#done')).not.toHaveClass(/hidden/, { timeout: 5000 });
  expect(capturedBody).not.toBeNull();
  expect(capturedBody!['text']).toBe(PENDING_TEXT);
  expect(capturedBody!['deckId']).toBe(MOCK_DECKS[1].id);
});

// ── Error state ───────────────────────────────────────────────────────────────

test('shows error state when server is unreachable', async ({ page }) => {
  // Override health checks to fail so apiBase() throws
  for (const base of ['http://kotoba.local', 'http://localhost:3001']) {
    await page.route(`${base}/health`, (route) => route.abort());
  }

  await page.goto(POPUP_URL);
  await expect(page.locator('#error')).not.toHaveClass(/hidden/, { timeout: 8000 });
  await expect(page.locator('#error-msg')).toContainText('unreachable');
});

test('shows error when no pending text is set', async ({ page }) => {
  // Override browser mock to return no pending text
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>)['browser'] = {
      storage: {
        session: {
          get: () => Promise.resolve({}),
          remove: () => Promise.resolve(),
        },
      },
    };
    window.close = () => {};
  });

  await page.goto(POPUP_URL);
  await expect(page.locator('#error')).not.toHaveClass(/hidden/, { timeout: 5000 });
  await expect(page.locator('#error-msg')).toContainText('No text captured');
});
