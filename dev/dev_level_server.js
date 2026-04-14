const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.LEVEL_SERVER_PORT) || 4100;
const LEVEL_DATA_PATH = path.join(__dirname, "level_data.js");
const MAX_BODY_BYTES = 5 * 1024 * 1024;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", ...corsHeaders });
  res.end(JSON.stringify(body));
}

function loadLevelData() {
  const previous = global.BattlechurchLevelData;
  delete require.cache[require.resolve(LEVEL_DATA_PATH)];
  global.BattlechurchLevelData = {};
  try {
    require(LEVEL_DATA_PATH);
  } catch (err) {
    console.warn("Level data load failed:", err.message);
  }
  const data = global.BattlechurchLevelData || {};
  global.BattlechurchLevelData = previous;
  return data;
}

function buildLevelDataFile(data) {
  const payload = { ...data };
  if (payload.devLevelConfig === undefined) payload.devLevelConfig = null;
  const serialized = JSON.stringify(payload, null, 2);
  return `(function(global) {\n  const DATA = ${serialized};\n  const ns = global.BattlechurchLevelData || (global.BattlechurchLevelData = {});\n  Object.assign(ns, DATA);\n})(typeof window !== "undefined" ? window : globalThis);\n`;
}

function writeConfig(config) {
  const data = loadLevelData();
  data.devLevelConfig = config || null;
  const content = buildLevelDataFile(data);
  fs.writeFileSync(LEVEL_DATA_PATH, content, "utf8");
  return data.devLevelConfig;
}

function handleGetConfig(res) {
  const data = loadLevelData();
  sendJson(res, 200, { ok: true, config: data.devLevelConfig || null, data });
}

function handleSaveConfig(req, res) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > MAX_BODY_BYTES) {
      sendJson(res, 413, { ok: false, error: "Payload too large" });
      req.destroy();
    }
  });
  req.on("end", () => {
    try {
      const parsed = JSON.parse(body || "{}");
      const config = parsed && typeof parsed === "object" && parsed.config ? parsed.config : parsed;
      if (!config || typeof config !== "object") {
        throw new Error("Config payload must be an object");
      }
      writeConfig(config);
      sendJson(res, 200, { ok: true });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
    }
  });
}

const server = http.createServer((req, res) => {
  const pathname = (req.url || "").split("?")[0];
  if (req.method === "OPTIONS") {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  if (req.method === "GET" && pathname === "/level-config") {
    handleGetConfig(res);
    return;
  }

  if (req.method === "POST" && pathname === "/level-config") {
    handleSaveConfig(req, res);
    return;
  }

  if (req.method === "GET" && pathname === "/") {
    sendJson(res, 200, {
      ok: true,
      message: "POST /level-config with { config: {...} } to overwrite level_data.js",
    });
    return;
  }

  sendJson(res, 404, { ok: false, error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`[dev-level-server] Listening on http://localhost:${PORT}`);
});
