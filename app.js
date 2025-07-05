// app.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { execArgv } = require("process");

const app = express();
const PORT = 3333;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use("/data", express.static(path.join(__dirname, "../exchange-automation-python/data")));

// Ana Sayfa
app.get("/", (req, res) => {
res.redirect("/dashboard");
});

// Dashboard
app.get("/dashboard", (req, res) => {
  const reportDir = path.join(__dirname, "../exchange-automation-python/data");

  fs.readdir(reportDir, (err, files) => {
    if (err) {
      return res.render("dashboard", {
        files: [],
        fileCount: 0,
        lastReportDate: null,
        message: "Dosyalar okunamadı."
      });
    }

    const sortedFiles = files.filter(f => f.endsWith(".xlsx")).sort().reverse();
    const lastFile = sortedFiles[0];

    let date = null;
    if (lastFile) {
      const match = lastFile.match(/\d{2}-\d{2}-\d{4}/);
      if (match) date = match[0];
    }

    res.render("dashboard", {
      files: sortedFiles,
      fileCount: sortedFiles.length,
      lastReportDate: date,
      message: req.query.success ? "Bot başarıyla çalıştırıldı!✅" : null
    });
  });
});

// Ayarları Göster
app.get("/settings", (req, res) => {
  const settings = JSON.parse(fs.readFileSync("../settings.json", "utf8"));
  res.render("settings", { settings });
});

// Ayarları Güncelle
app.post("/settings", (req, res) => {
  const updated = {
    recipient_email: req.body.recipient_email,
    send_time: req.body.send_time,
    currencies: req.body.currencies.split(",").map(x => x.trim().toUpperCase())
  };
  fs.writeFileSync("../settings.json", JSON.stringify(updated, null, 4));
  res.redirect("/settings");
});

// Excel Raporlarını Listele
app.get("/reports", (req, res) => {
  const reportsDir = path.join(__dirname, "../data");
  const files = fs.existsSync(reportsDir) ? fs.readdirSync(reportsDir) : [];
  res.render("reports", { files });
});

// Botu Manuel Çalıştır
app.get("/run", (req, res) => {
  const pythonPath = `"C:/Users/muham/AppData/Local/Programs/Python/Python312/python.exe"`; // Python yolu
  const scriptPath = path.join(__dirname, "../exchange-automation-python/main.py"); // main.py yolu

  // Python dosyasını çalıştır
  exec(
    `${pythonPath} "${scriptPath}"`,
    {
      cwd: path.join(__dirname, "../exchange-automation-python") // 👈 Python scripti bu klasörde çalışacak
    },
    (err, stdout, stderr) => {
      if (err) {
        console.error("❌ exec error:", err.message);
        console.error("⚠️ STDERR:\n", stderr);
        return res.send("❌ Bot çalıştırılamadı. Hata konsola yazıldı.");
      }

      console.log("✅ STDOUT:\n", stdout);
      if (stderr) console.error("⚠️ STDERR:\n", stderr);
      res.redirect("/dashboard?success=1");
    }
  );
});



// Sunucuyu Başlat
app.listen(PORT, () => {
  console.log(`🚀 Panel running at http://localhost:${PORT}`);
});
