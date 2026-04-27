import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const CLI_PATH_ENTRIES = [
  "/opt/homebrew/bin",
  "/opt/homebrew/sbin",
  "/usr/local/bin",
  "/usr/local/sbin",
  "/usr/bin",
  "/bin",
  "/usr/sbin",
  "/sbin"
];

function cliEnv() {
  const existing = (process.env.PATH || "").split(path.delimiter).filter(Boolean);
  return {
    ...process.env,
    PATH: Array.from(new Set([...CLI_PATH_ENTRIES, ...existing])).join(path.delimiter)
  };
}

export async function runCliCommand(
  command: string,
  args: string[],
  options: {
    cwd: string;
    input: string;
    timeoutMs: number;
  }
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: cliEnv(),
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Timed out while running ${command}.`));
    }, options.timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve(stdout);
        return;
      }

      reject(new Error(stderr || stdout || `${command} exited with code ${code}.`));
    });

    child.stdin.write(options.input);
    child.stdin.end();
  });
}

export async function resolveBinary(
  preferred: string | undefined,
  candidates: string[]
): Promise<string> {
  for (const candidate of [preferred, ...candidates].filter(Boolean) as string[]) {
    if (!candidate.includes("/")) {
      if (await commandExists(candidate)) {
        return candidate;
      }
      continue;
    }

    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error(`${candidates.at(-1) ?? "Provider"} CLI is not installed.`);
}

async function commandExists(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("command", ["-v", command], { shell: true, env: cliEnv(), stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

export async function binaryStatus(preferred: string | undefined, candidates: string[]) {
  try {
    const binaryPath = await resolveBinary(preferred, candidates);
    return { available: true, binaryPath };
  } catch {
    return { available: false, binaryPath: undefined };
  }
}

export function parseJsonPayload<T>(raw: string): T {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Provider returned an empty response.");
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Provider response did not contain JSON.");
    }
    return JSON.parse(match[0]) as T;
  }
}
