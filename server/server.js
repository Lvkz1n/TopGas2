import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { query } from "./db.js";
import { requireAuth, requireAdmin, verifyCredentials } from "./auth.js";
import clientes from "./routes/clientes.js";
import entregas from "./routes/entregas.js";
import usuarios from "./routes/usuarios.js";
import configuracoes from "./routes/configuracoes.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));

// ===== AUTH (usuário/senha) =====
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: "missing_fields" });
  const user = await verifyCredentials(email, password);
  if (!user) return res.status(401).json({ error: "invalid_credentials" });
  const base64 = Buffer.from(
    JSON.stringify({ email: user.email }),
    "utf8"
  ).toString("base64");
  res.cookie("tg.session", base64, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  res.json({ ok: true, role: user.role });
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("tg.session");
  res.json({ ok: true });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ email: req.user.email, role: req.user.role });
});

// ===== MÉTRICAS DASHBOARD =====
app.get("/api/metricas", requireAuth, async (_req, res) => {
  const total = await query("SELECT COUNT(*) FROM entregas");
  const sucesso = await query(
    "SELECT COUNT(*) FROM entregas WHERE status_pedido='entregue'"
  );
  const cancel = await query(
    "SELECT COUNT(*) FROM entregas WHERE status_pedido='cancelado'"
  );
  const regioes = await query(
    `SELECT bairro, COUNT(*)::int AS total FROM entregas WHERE bairro IS NOT NULL GROUP BY bairro ORDER BY total DESC LIMIT 20`
  );
  res.json({
    total_entregas: Number(total.rows[0].count),
    entregas_sucesso: Number(sucesso.rows[0].count),
    cancelamentos: Number(cancel.rows[0].count),
    regioes: regioes.rows,
  });
});

// ===== ROTAS DE MÓDULOS =====
app.use("/api/clientes", requireAuth, clientes);
app.use("/api/entregas", requireAuth, entregas);
app.use("/api/usuarios", requireAuth, requireAdmin, usuarios);
app.use("/api/configuracoes", requireAuth, requireAdmin, configuracoes);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("API TopGas ouvindo na porta", PORT));
