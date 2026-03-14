import Kuroshiro from 'kuroshiro';
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';

let _kuroshiro: Kuroshiro | null = null;

async function getKuroshiro(): Promise<Kuroshiro> {
  if (_kuroshiro) return _kuroshiro;
  _kuroshiro = new Kuroshiro();
  await _kuroshiro.init(new KuromojiAnalyzer());
  return _kuroshiro;
}

export async function getFurigana(text: string): Promise<string> {
  const k = await getKuroshiro();
  return k.convert(text, { mode: 'furigana', to: 'hiragana' });
}

export async function getTranslation(
  text: string,
  ollamaUrl: string,
  model: string,
): Promise<string> {
  const res = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: `Translate this Japanese sentence to natural English. Reply with only the translation, no explanation.\n\n${text}`,
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  const json = (await res.json()) as { response: string };
  return json.response.trim();
}
