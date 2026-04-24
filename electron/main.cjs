const { app, BrowserWindow, shell } = require("electron");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const next = require("next");

const useNextDev = process.env.SIGNALTUBE_ELECTRON_DEV === "true";
const PORT = Number(process.env.SIGNALTUBE_DESKTOP_PORT || 41739);

let server;

const ASSET_TYPES = {
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".wav": "audio/wav"
};

function tryServePublicAsset(request, response) {
  if (!request.url?.startsWith("/assets/")) {
    return false;
  }

  const assetName = decodeURIComponent(request.url.replace(/^\/assets\//, "").split("?")[0] ?? "");
  const safeAssetName = path.basename(assetName);

  if (!safeAssetName || safeAssetName !== assetName) {
    response.writeHead(400);
    response.end("Bad asset request");
    return true;
  }

  const assetPath = path.join(app.getAppPath(), "public", "assets", safeAssetName);

  try {
    const data = fs.readFileSync(assetPath);
    response.writeHead(200, {
      "Content-Type": ASSET_TYPES[path.extname(safeAssetName).toLowerCase()] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable"
    });
    response.end(data);
  } catch {
    response.writeHead(404);
    response.end("Asset not found");
  }

  return true;
}

async function startNextServer() {
  process.env.SIGNALTUBE_DATA_DIR = path.join(app.getPath("userData"), "memos");
  const dir = app.getAppPath();
  const nextApp = next({ dev: useNextDev, dir, hostname: "127.0.0.1", port: PORT });
  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();

  server = http.createServer((request, response) => {
    if (tryServePublicAsset(request, response)) {
      return;
    }

    handle(request, response);
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, "127.0.0.1", resolve);
  });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    title: "SignalTube",
    backgroundColor: "#f8fafc",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 18, y: 18 },
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.loadURL(`http://127.0.0.1:${PORT}`);

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(async () => {
  app.setName("SignalTube");
  await startNextServer();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  server?.close();
});
