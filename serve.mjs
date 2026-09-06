/**
 * Minimal static preview server for docs/. No dependencies.
 *
 *   node serve.mjs [port]
 *
 * The generated site works fine opened directly over file://; this exists for
 * browsers and tools that refuse local file access.
 */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "docs");
const PORT = Number(process.argv[2]) || 8080;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

createServer(async (req, res) => {
  try {
    const url = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    let file = path.join(ROOT, url);

    // Keep requests inside docs/
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    if ((await stat(file).catch(() => null))?.isDirectory()) {
      file = path.join(file, "index.html");
    }

    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" }).end("Not found");
  }
}).listen(PORT, () => {
  console.log(`Serving docs/ at http://localhost:${PORT}`);
});
