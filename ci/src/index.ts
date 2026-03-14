/**
 * kana-site CI pipelines via Dagger.
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
class KanaCi {
  /**
   * Run client quality gates: prettier, eslint, typecheck, vitest, vite build.
   */
  @func()
  async clientQuality(source: Directory): Promise<string> {
    const npmCache = dag.cacheVolume("kana-npm-root");

    return dag
      .container()
      .from("node:24-slim")
      .withMountedCache("/root/.npm", npmCache)
      .withMountedDirectory("/app", source)
      .withWorkdir("/app")
      .withExec(["npm", "ci"])
      .withExec(["npm", "run", "format", "--", "--check"])
      .withExec(["npm", "run", "lint:check"])
      .withExec(["npm", "run", "typecheck"])
      .withExec(["npm", "run", "test:run"])
      .withExec(["npm", "run", "build"])
      .stdout();
  }

  /**
   * Run server quality gates: typecheck, vitest.
   * Uses Node 22 — better-sqlite3 ships prebuilt binaries for Node 22.
   */
  @func()
  async serverQuality(source: Directory): Promise<string> {
    const npmCache = dag.cacheVolume("kana-npm-server");

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
