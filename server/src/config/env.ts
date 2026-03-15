import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DB_PATH: z.string().default('./dev.db'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  OLLAMA_URL: z.string().default('http://ollama:11434'),
  OLLAMA_MODEL: z.string().default('qwen2.5:3b'),
  /** If set, all /api/v1/* requests must supply Authorization: Bearer <key>. */
  KOTOBA_API_KEY: z.string().optional(),
});

export type Config = z.infer<typeof EnvSchema>;

let _config: Config | null = null;

export function getConfig(): Config {
  if (_config) return _config;
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error('[config] Invalid environment:', result.error.flatten());
    process.exit(1);
  }
  _config = result.data;
  return _config;
}
