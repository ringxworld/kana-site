function timestamp() {
  return new Date().toISOString();
}

export const logger = {
  info: (msg: string, meta?: unknown) =>
    console.log(`[${timestamp()}] INFO  ${msg}`, meta ?? ''),
  warn: (msg: string, meta?: unknown) =>
    console.warn(`[${timestamp()}] WARN  ${msg}`, meta ?? ''),
  error: (msg: string, meta?: unknown) =>
    console.error(`[${timestamp()}] ERROR ${msg}`, meta ?? ''),
};
