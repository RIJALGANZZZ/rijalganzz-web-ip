const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

const app = express();
const PORT = 3000;

// 🔐 Inisialisasi Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(require('./firebase.json'))
});

const db = admin.firestore();
const ipDocRef = db.collection('settings').doc('ipList');

// Middleware
app.use(bodyParser.json());
app.use(express.static('public')); // folder HTML kamu

// 🔁 Fungsi untuk baca data IP dari Firestore
async function readDb() {
  const doc = await ipDocRef.get();
  if (!doc.exists) {
    await ipDocRef.set({ ip: [] });
    return { ip: [] };
  }
  return doc.data();
}

// 💾 Fungsi untuk tulis data IP ke Firestore
async function writeDb(data) {
  await ipDocRef.set(data);
}

// 📡 Endpoint untuk mendapatkan IP JSON
app.get('/auth/ipjson', async (req, res) => {
  try {
    const data = await readDb();
    res.json({ ip: data.ip || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read data from Firebase.' });
  }
});

// ✏️ Endpoint untuk update IP list (PUT)
app.put('/api/admin/ip-settings', async (req, res) => {
  try {
    const newIpList = req.body;

    if (!Array.isArray(newIpList)) {
      return res.status(400).json({ error: 'Invalid IP list format.' });
    }

    const validIps = newIpList.filter(ip =>
      /^(\d{1,3}\.){3}\d{1,3}$/.test(ip)
    );

    await writeDb({ ip: validIps });
    res.json({ message: 'IP list updated in Firebase.', ip: validIps });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update IP list in Firebase.' });
  }
});

// 🌐 HTML Panel
app.get('/admin/ip-settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 🔚 Fallback 404
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
  <lottie-player src="https://assets1.lottiefiles.com/packages/lf20_qp1q7mct.json" background="transparent" speed="1" style="width: 300px; height: 300px;" loop autoplay></lottie-player>  
  <div class="text-center mt-6">  
    <h1 class="text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 animate-pulse drop-shadow-[0_2px_10px_rgba(255,0,255,0.5)]">404</h1>  
    <p class="text-xl text-gray-300 mt-4 font-mono overflow-hidden whitespace-nowrap border-r-2 border-white">Oops! This Web Only Database...</p>  
  </div>
</body>
</html>`);
});

// ▶️ Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});