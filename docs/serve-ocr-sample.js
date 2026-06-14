const http = require("http");
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "ocr-medicine-bag-samples.html");
const port = 8080;

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, `http://127.0.0.1:${port}`).pathname;

  if (pathname !== "/" && pathname !== "/ocr-medicine-bag-samples.html") {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  fs.readFile(file, (error, data) => {
    if (error) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("File read error");
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(data);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`OCR sample page: http://127.0.0.1:${port}/`);
});
