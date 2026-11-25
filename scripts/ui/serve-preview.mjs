import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../static");
const port = Number(process.env.GRADSTUDIO_PREVIEW_PORT || 4173);
const host = process.env.GRADSTUDIO_PREVIEW_HOST || "127.0.0.1";
const types = {
  ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".ico": "image/x-icon",
  ".js": "application/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png",
  ".svg": "image/svg+xml", ".webp": "image/webp"
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || `${host}:${port}`}`);
  const requested = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.resolve(root, `.${requested}`);
  if (!filePath.startsWith(`${root}${path.sep}`) && filePath !== root) return send(response, 403, "Forbidden");
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return send(response, 404, "Not found");
  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    "X-Content-Type-Options": "nosniff"
  });
  fs.createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => console.log(`GradStudio local preview: http://${host}:${port}`));

function send(response, status, body) {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" });
  response.end(body);
}
