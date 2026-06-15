const { createServer } = require("http");
const next = require("next");

const hostname = process.env.HOSTNAME || "127.0.0.1";
const port = Number(process.env.PORT || 3000);
const dev = process.env.NEXT_DEV === "1";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((request, response) => {
    handle(request, response);
  }).listen(port, hostname, () => {
    console.log(`RunGarden is running at http://${hostname}:${port}`);
  });
});
