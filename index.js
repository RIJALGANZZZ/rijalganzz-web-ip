const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const app = express();
const PORT = 3000;


// 🔐 Inisialisasi Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(require('./serviceAccountKey.json')),
  databaseURL: 'https://ip-rijalganz-asia-southeast1.firebasedatabase.app'
});

const db = admin.database();
const ipRef = db.ref('ipList');

// Middleware
app.use(bodyParser.json());
app.use(express.static('public')); 
app.get('/auth/ipjson', async (req, res) => {
  try {
    const snapshot = await ipRef.once('value');
    const ipList = snapshot.val() || [];
    res.json({ ip: ipList });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch IP list' });
  }
});

// ✅ Endpoint: Serve Admin Panel
app.get('/admin/ip-settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ✅ Endpoint: Update IP list
app.put('/api/admin/ip-settings', async (req, res) => {
  const newIpList = req.body;
  if (!Array.isArray(newIpList)) return res.status(400).send("Invalid data format");

  try {
    await ipRef.set(newIpList);
    res.send("IP list updated successfully");
  } catch (error) {
    res.status(500).json({ error: 'Failed to update IP list' });
  }
});

// 404 fallback
app.use((req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>404 Not Found</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"></script>
</head>

<body class="bg-gray-900 text-white flex items-center justify-center min-h-screen flex-col p-4">
    <lottie-player src="https://assets1.lottiefiles.com/packages/lf20_qp1q7mct.json" background="transparent" speed="1" style="width: 300px; height: 300px;" loop autoplay>
    </lottie-player>

    <div class="text-center mt-6">
        <h1 class="text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 animate-pulse drop-shadow-[0_2px_10px_rgba(255,0,255,0.5)]">
            404
        </h1>
        <p class="text-xl text-gray-300 mt-4 font-mono overflow-hidden whitespace-nowrap border-r-2 border-white">
            Oops! This Web Only Database...
        </p>
    </div>
</body>

</html>`)
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});