#!/usr/bin/env node

const fs = require("fs");
const http = require("http");
const path = require("path");

const root = path.join(__dirname, "..");
const portArgIndex = process.argv.indexOf("--port");
const port =
  portArgIndex === -1 ? 8000 : Number.parseInt(process.argv[portArgIndex + 1], 10);

if (!Number.isInteger(port) || port <= 0) {
  console.error("Usage: node scripts/serve-static.js --port 8000");
  process.exit(1);
}

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
};

function resolveRequestPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath);
  const requestPath = decodedPath === "/" ? "/index.html" : decodedPath;
  const filePath = path.normalize(path.join(root, requestPath));
  return filePath.startsWith(root) ? filePath : null;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);
  const filePath = resolveRequestPath(url.pathname);

  if (!filePath) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const contentType = contentTypes[path.extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving http://127.0.0.1:${port}`);
});
