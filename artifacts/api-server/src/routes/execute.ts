import { Router } from "express";
import { spawn } from "child_process";
import { logger } from "../lib/logger";

const router = Router();

const LANGUAGE_COMMANDS: Record<string, { cmd: string; args: string[] }> = {
  python: { cmd: "python3", args: ["-c"] },
  python3: { cmd: "python3", args: ["-c"] },
  node: { cmd: "node", args: ["-e"] },
  javascript: { cmd: "node", args: ["-e"] },
  bash: { cmd: "bash", args: ["-c"] },
  sh: { cmd: "bash", args: ["-c"] },
};

router.post("/execute", async (req, res) => {
  const { code, language, stdin } = req.body as { code: string; language: string; stdin?: string };

  if (!code || !language) {
    res.status(400).json({ error: "code and language are required" });
    return;
  }

  const langConfig = LANGUAGE_COMMANDS[language.toLowerCase()];
  if (!langConfig) {
    res.status(400).json({ error: `Unsupported language: ${language}. Supported: python, node, bash` });
    return;
  }

  const start = Date.now();

  try {
    const result = await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve) => {
      let stdout = "";
      let stderr = "";

      const proc = spawn(langConfig.cmd, [...langConfig.args, code], {
        cwd: process.cwd(),
        env: { ...process.env, PYTHONUNBUFFERED: "1" },
        timeout: 30000,
      });

      if (stdin) proc.stdin.write(stdin);
      proc.stdin.end();

      proc.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
      proc.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

      proc.on("error", (err) => {
        resolve({ stdout, stderr: stderr + "\nError: " + err.message, exitCode: 1 });
      });

      proc.on("close", (code) => {
        resolve({ stdout, stderr, exitCode: code ?? 0 });
      });
    });

    const executionTime = Date.now() - start;
    req.log.info({ language, exitCode: result.exitCode, executionTime }, "Code executed");

    res.json({
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      executionTime,
    });
  } catch (err) {
    logger.error({ err }, "Execution error");
    res.status(500).json({ error: "Execution failed" });
  }
});

router.get("/packages/:language", async (req, res) => {
  const { language } = req.params;
  const { package: pkg } = req.query as { package?: string };

  if (!pkg) {
    res.status(400).json({ error: "package query param required" });
    return;
  }

  try {
    let installCmd = "";
    if (language === "python") installCmd = `pip install ${pkg} 2>&1`;
    else if (language === "node") installCmd = `npm install -g ${pkg} 2>&1`;
    else {
      res.status(400).json({ error: "Unsupported language for package install" });
      return;
    }

    const result = await new Promise<{ stdout: string; exitCode: number }>((resolve) => {
      let stdout = "";
      const proc = spawn("bash", ["-c", installCmd], { timeout: 60000 });
      proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
      proc.stderr.on("data", (d: Buffer) => { stdout += d.toString(); });
      proc.on("close", (code) => resolve({ stdout, exitCode: code ?? 0 }));
      proc.on("error", () => resolve({ stdout, exitCode: 1 }));
    });

    res.json({ output: result.stdout, exitCode: result.exitCode });
  } catch (err) {
    res.status(500).json({ error: "Install failed" });
  }
});

export default router;
