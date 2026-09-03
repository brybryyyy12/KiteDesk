import {
  spawnSync,
} from "node:child_process";
import {
  fileURLToPath,
} from "node:url";

export default function globalSetup() {
  const serverDirectory = fileURLToPath(
    new URL("../../server", import.meta.url)
  );

  const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
  for (const script of ["test:e2e:prepare", "build"]) {
    const result = spawnSync(
      npmExecutable,
      ["run", script],
      {
        cwd: serverDirectory,
        stdio: "inherit",
        shell: process.platform === "win32",
      }
    );

    if (result.status !== 0) {
      throw new Error(`E2E setup command failed: npm run ${script}`);
    }
  }
}
