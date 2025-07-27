const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json()); 

admin.initializeApp({
  credential: admin.credential.cert(require('./serviceAccountKey.json')),
  databaseURL: "https://ip-rizalganz.firebaseapp.com"
});

const db = admin.database();
const ipRef = db.ref("approved_ips");

app.get('/auth/ipjson', async (req, res) => {
  try {
    const snapshot = await ipRef.once('value');
    const data = snapshot.val() || {};
    const result = Object.entries(data)
      .filter(([ip, approved]) => approved === true)
      .map(([ip]) => ip);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/admin/ip-settings', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>IP Admin Panel</title>
  <script defer src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
</head>
<body class="bg-gray-100 p-6">
  <h1 class="text-2xl font-bold mb-6">🛡️ IP Admin Panel</h1>

  <!-- Add IP -->
  <div class="mb-8 p-4 bg-white shadow rounded">
    <h2 class="text-lg font-semibold mb-2">➕ Add IP</h2>
    <div class="flex space-x-4">
      <input type="text" id="newIp" placeholder="Enter IP (e.g. 1.1.1.1)" class="border p-2 rounded w-full" />
      <button onclick="addIp()" class="bg-blue-500 text-white px-4 py-2 rounded">Add</button>
    </div>
  </div>

  <!-- Delete IP -->
  <div class="p-4 bg-white shadow rounded">
    <h2 class="text-lg font-semibold mb-2">🗑️ Delete IP</h2>
    <div class="flex space-x-4 items-center">
      <select id="ipSelect" class="border p-2 rounded w-full"></select>
      <button onclick="deleteIp()" class="bg-red-500 text-white px-4 py-2 rounded">Delete</button>
    </div>
  </div>

  <p id="status" class="mt-4 text-green-600 font-semibold"></p>

<script>
  const apiUrl = "/auth/ipjson";
  let ipList = [];

  async function fetchIps() {
    try {
      const res = await fetch(apiUrl);
      const data = await res.json();
      ipList = data || [];

      const select = document.getElementById("ipSelect");
      select.innerHTML = "";
      ipList.forEach(ip => {
        const opt = document.createElement("option");
        opt.value = ip;
        opt.textContent = ip;
        select.appendChild(opt);
      });
    } catch (err) {
      console.error("Error fetching IPs:", err);
    }
  }

  async function addIp() {
    const newIp = document.getElementById("newIp").value.trim();
    if (!newIp) return alert("IP tidak boleh kosong");
    if (ipList.includes(newIp)) return alert("IP sudah ada");

    const updated = [...ipList, newIp];
    try {
      await fetch("/ip-settings", {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      document.getElementById("status").textContent = \`IP \${newIp} ditambahkan.\`;
      document.getElementById("newIp").value = "";
      fetchIps();
    } catch (err) {
      console.error("Error adding IP:", err);
    }
  }

  async function deleteIp() {
    const select = document.getElementById("ipSelect");
    const selectedIp = select.value;
    if (!selectedIp) return;

    const updated = ipList.filter(ip => ip !== selectedIp);
    try {
      await fetch("/ip-settings", {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      document.getElementById("status").textContent = \`IP \${selectedIp} dihapus.\`;
      fetchIps();
    } catch (err) {
      console.error("Error deleting IP:", err);
    }
  }

  fetchIps();
</script>
</body>
</html>`);
});
app.use((req, res) => {
  res.status(404).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>404 Not Found</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"></script>
</head>
<body class="bg-gray-900 text-white flex items-center justify-center min-h-screen flex-col p-4">
  <lottie-player 
    src="https://assets1.lottiefiles.com/packages/lf20_qp1q7mct.json"
    background="transparent"
    speed="1"
    style="width: 300px; height: 300px;"
    loop
    autoplay>
  </lottie-player>

<div class="text-center mt-6">
  <h1 class="text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 animate-pulse drop-shadow-[0_2px_10px_rgba(255,0,255,0.5)]">
    404
  </h1>
  <p class="text-xl text-gray-300 mt-4 font-mono overflow-hidden whitespace-nowrap border-r-2 border-white">
    Oops! Halaman tidak ditemukan...
  </p>
</div>
</body>
</html>`);
});
app.put('/ip-settings', async (req, res) => {
  const incomingIPs = req.body;

  if (!Array.isArray(incomingIPs)) {
    return res.status(400).json({ error: 'Request body must be an array of IPs' });
  }

  try {
    // Set all IPs to true, others to false
    const currentSnapshot = await ipRef.once('value');
    const currentData = currentSnapshot.val() || {};

    const newData = {};
    // Set submitted IPs to true
    for (const ip of incomingIPs) {
      if (ip) newData[ip] = true;
    }

    // Set others to false (removed IPs)
    for (const ip in currentData) {
      if (!incomingIPs.includes(ip)) {
        newData[ip] = false;
      }
    }

    await ipRef.set(newData);
    res.json({ message: "IP list updated", data: newData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`✅ IP API running at http://localhost:${port}`);
});
