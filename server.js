const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

app.post("/submit", async (req, res) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(502).json({
      success: false,
      message: "Frontend could not connect to the Flask backend.",
      error: error.message
    });
  }
});

app.get("/health", (_req, res) => {
  res.json({ service: "Express frontend", status: "running" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Frontend running on http://localhost:${PORT}`);
  console.log(`Flask backend target: ${BACKEND_URL}`);
});
