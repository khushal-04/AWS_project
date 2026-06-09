const express = require("express");
const http = require("http");
const os = require("os");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

async function getMetadata(metaPath) {
  return new Promise((resolve) => {
    const tokenReq = http.request(
      { hostname: "169.254.169.254", path: "/latest/api/token", method: "PUT",
        headers: { "X-aws-ec2-metadata-token-ttl-seconds": "21600" }, timeout: 1000 },
      (res) => {
        let token = "";
        res.on("data", (d) => (token += d));
        res.on("end", () => {
          const metaReq = http.request(
            { hostname: "169.254.169.254", path: "/latest/meta-data/" + metaPath,
              method: "GET", headers: { "X-aws-ec2-metadata-token": token.trim() }, timeout: 1000 },
            (metaRes) => {
              let data = "";
              metaRes.on("data", (d) => (data += d));
              metaRes.on("end", () => resolve(data.trim()));
            }
          );
          metaReq.on("error", () => resolve(null));
          metaReq.on("timeout", () => { metaReq.destroy(); resolve(null); });
          metaReq.end();
        });
      }
    );
    tokenReq.on("error", () => resolve(null));
    tokenReq.on("timeout", () => { tokenReq.destroy(); resolve(null); });
    tokenReq.end();
  });
}

let requestCount = 0;
const serverStartTime = new Date().toISOString();

app.get("/api/info", async (req, res) => {
  const [instanceId, az, instanceType, publicIp, privateIp, amiId] = await Promise.all([
    getMetadata("instance-id"),
    getMetadata("placement/availability-zone"),
    getMetadata("instance-type"),
    getMetadata("public-ipv4"),
    getMetadata("local-ipv4"),
    getMetadata("ami-id"),
  ]);
  const isEc2 = !!instanceId;
  res.json({
    instanceId: instanceId || "local-dev",
    az: az || "N/A",
    instanceType: instanceType || "N/A",
    publicIp: publicIp || "N/A",
    privateIp: privateIp || (os.networkInterfaces()?.eth0?.[0]?.address) || "N/A",
    amiId: amiId || "N/A",
    hostname: os.hostname(),
    platform: os.platform(),
    nodeVersion: process.version,
    uptime: Math.floor(process.uptime()),
    isEc2, region: az ? az.slice(0, -1) : "N/A",
    requestCount: ++requestCount,
    serverStartTime, timestamp: new Date().toISOString(),
  });
});

ap.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
  console.log("Dashboard: http://localhost:" + PORT);
});
