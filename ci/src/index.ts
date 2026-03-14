/**
 * kotoba-lab CI pipelines via Dagger.
 *
 * Each function mirrors the equivalent quality-gates.yml job but runs inside
 * a container with persistent cache volumes — npm installs are only downloaded
 * on the first run; subsequent runs reuse the Dagger Engine cache.
 *
 * Usage (local):
 *   dagger call -m ./ci client-quality --source .
 *   dagger call -m ./ci server-quality --source .
 */

import { dag, Directory, object, func } from "@dagger.io/dagger";

@object()
class KotobaLabCi {
  /**
   * Run client quality gates: prettier, eslint, typecheck, vitest, vite build,
   * and Playwright popup smoke tests.
   */
  @func()
  async clientQuality(source: Directory): Promise<string> {
    const npmCache = dag.cacheVolume("kotoba-npm-root");
    const playwrightCache = dag.cacheVolume("kotoba-playwright");

    return dag
      .container()
      .from("node:24-slim")
      // System deps required by Playwright's headless Chromium
      .withExec(["apt-get", "update", "-qq"])
      .withExec([
        "apt-get", "install", "-y", "--no-install-recommends",
        "libnss3", "libatk1.0-0", "libatk-bridge2.0-0", "libcups2",
        "libdrm2", "libxkbcommon0", "libxcomposite1", "libxdamage1",
        "libxfixes3", "libxrandr2", "libgbm1", "libasound2",
        "libpangocairo-1.0-0", "libgtk-3-0", "libx11-xcb1",
      ])
      .withMountedCache("/root/.npm", npmCache)
      .withMountedCache("/root/.cache/ms-playwright", playwrightCache)
      .withMountedDirectory("/app", source)
      .withWorkdir("/app")
      .withExec(["npm", "ci"])
      .withExec(["npm", "run", "format", "--", "--check"])
      .withExec(["npm", "run", "lint:check"])
      .withExec(["npm", "run", "typecheck"])
      .withExec(["npm", "run", "test:run"])
      .withExec(["npm", "run", "build"])
      .withExec(["npx", "playwright", "install", "chromium"])
      .withExec(["npm", "run", "test:e2e"])
      .stdout();
  }

  /**
   * Run server quality gates: typecheck, vitest.
   * Uses Node 22 — better-sqlite3 ships prebuilt binaries for Node 22.
   */
  @func()
  async serverQuality(source: Directory): Promise<string> {
    const npmCache = dag.cacheVolume("kotoba-npm-server");

    return dag
      .container()
      .from("node:22-slim")
      .withMountedCache("/root/.npm", npmCache)
      .withMountedDirectory("/app", source)
      .withWorkdir("/app/server")
      .withExec(["npm", "ci"])
      .withExec(["npx", "tsc", "--noEmit"])
      .withExec(["npm", "run", "test"])
      .stdout();
  }
}
