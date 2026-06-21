import { WebSocketServer, WebSocket } from "ws";
import { spawn } from "child_process";
import type { Server, IncomingMessage } from "http";
import type { Duplex } from "stream";
import { logger } from "./lib/logger";

const PKG_SETUP = `
pkg() {
  case "$1" in
    install)   shift; npm install -g "$@" 2>&1 ;;
    uninstall) shift; npm uninstall -g "$@" 2>&1 ;;
    upgrade)   npm update -g 2>&1 ;;
    list)      npm list -g --depth=0 2>&1 ;;
    search)    npm search "$2" 2>&1 ;;
    *)         echo "Usage: pkg install|uninstall|upgrade|list|search <pkg>" ;;
  esac
}
export -f pkg
alias pip='pip3'
export PS1='\\[\\033[1;32m\\]\\u@hackerstudio\\[\\033[0m\\]:\\[\\033[1;34m\\]\\w\\[\\033[0m\\]\\$ '
`;

const WELCOME = [
  "\r\n\x1b[1;32m╔════════════════════════════════╗\x1b[0m",
  "\r\n\x1b[1;32m║   HackerStudio Linux Terminal  ║\x1b[0m",
  "\r\n\x1b[1;32m╚════════════════════════════════╝\x1b[0m",
  "\r\n\x1b[90mReal bash shell — persistent session\x1b[0m",
  "\r\n\x1b[90mcd, git, npm, pip, node, python3, ssh available\x1b[0m",
  "\r\n\x1b[90mpkg install <name>  →  npm install -g\x1b[0m",
  "\r\n",
].join("");

export function setupTerminalWS(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on(
    "upgrade",
    (req: IncomingMessage, socket: Duplex, head: Buffer) => {
      if (req.url === "/api/terminal") {
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit("connection", ws, req);
        });
      } else {
        socket.destroy();
      }
    },
  );

  wss.on("connection", (ws: WebSocket) => {
    logger.info("Terminal session opened");

    const shell = spawn("bash", ["--norc", "--noprofile"], {
      env: {
        ...process.env,
        TERM: "xterm-256color",
        COLORTERM: "truecolor",
        LANG: "en_US.UTF-8",
      },
      cwd: process.env.HOME ?? "/home/runner",
      stdio: ["pipe", "pipe", "pipe"],
    });

    const send = (data: string): void => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    };

    ws.send(WELCOME);

    shell.stdin.write(PKG_SETUP + "\n");
    shell.stdin.write("echo -e \"\\033[1;33mShell ready. Type 'help' for tips.\\033[0m\"\n");
    shell.stdin.write("PS1\n");
    shell.stdin.write('printf "\\033[1;32m%s@hackerstudio\\033[0m:\\033[1;34m%s\\033[0m\\$ " "$(whoami)" "$(pwd)"\n');

    shell.stdout.on("data", (d: Buffer) => {
      send(d.toString("utf8"));
    });

    shell.stderr.on("data", (d: Buffer) => {
      send(d.toString("utf8"));
    });

    shell.on("close", (code) => {
      send(`\r\n\x1b[1;31m[Shell exited — code ${code}]\x1b[0m\r\n`);
      if (ws.readyState === WebSocket.OPEN) ws.close();
    });

    shell.on("error", (err) => {
      logger.error({ err }, "Shell spawn error");
      send(`\r\n\x1b[1;31mShell error: ${err.message}\x1b[0m\r\n`);
    });

    ws.on("message", (raw) => {
      const data = raw.toString("utf8");
      if (shell.stdin.writable) {
        shell.stdin.write(data);
        if (data.includes("\n") || data === "\r") {
          shell.stdin.write(
            'printf "\\033[1;32m%s@hackerstudio\\033[0m:\\033[1;34m%s\\033[0m\\$ " "$(whoami)" "$(pwd)"\n',
          );
        }
      }
    });

    ws.on("close", () => {
      logger.info("Terminal session closed");
      shell.kill("SIGTERM");
    });

    ws.on("error", (err) => {
      logger.error({ err }, "Terminal WebSocket error");
      shell.kill("SIGTERM");
    });
  });
}
