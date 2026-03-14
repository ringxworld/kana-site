import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DB_PATH: z.string().default('./dev.db'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
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
