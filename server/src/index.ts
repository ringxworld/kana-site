import { serve } from '@hono/node-server';
import { getConfig } from './config/env';
import { getDb } from './db/client';
import { setupDatabase } from './db/setup';
import { logger } from './lib/logger';
import { app } from './routes/index';

const config = getConfig();

// Initialize DB before handling any requests
getDb(config.DB_PATH);
setupDatabase();

serve({ fetch: app.fetch, port: config.PORT }, (info) => {
  logger.info(`Server running on http://localhost:${info.port}`);
});
