import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// .env faylini yuklash
try {
  process.loadEnvFile();
} catch (e) {
  // .env bo'lmasa e'tiborsiz qoldiriladi
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

// API handler ni import qilish
const { default: arizaHandler } = await import("./api/ariza.js");

const server = http.createServer(async (req, rawRes) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = reqUrl.pathname;

  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${pathname}`);

  // ── API route ──
  if (pathname === "/api/ariza" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        req.body = JSON.parse(body);
      } catch {
        req.body = {};
      }

      const res = {
        statusCode: 200,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          rawRes.writeHead(this.statusCode, {
            "Content-Type": "application/json; charset=utf-8",
          });
          rawRes.end(JSON.stringify(data));
        },
      };

      try {
        await arizaHandler(req, res);
      } catch (err) {
        console.error("Handler error:", err);
        res.status(500).json({ success: false, error: "Server ichki xatosi" });
      }
    });
    return;
  }

  // ── Static fayllar ──
  let relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  let filePath = path.join(__dirname, relativePath);

  // Agar fayl mavjud bo'lmasa yoki papka bo'lsa, index.html ga yo'naltirish
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(__dirname, "index.html");
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
  };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      rawRes.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      rawRes.end("404 — Sahifa topilmadi");
      return;
    }
    rawRes.writeHead(200, { "Content-Type": mimeTypes[ext] || "text/plain; charset=utf-8" });
    rawRes.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`\n  ✅ Balans Plus serveri ishga tushdi: http://localhost:${PORT}\n`);
});
