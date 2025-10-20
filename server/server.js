import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import url from "url";
import { query } from "./db.js";
import { requireAuth, requireAdmin, verifyCredentials } from "./auth.js";
import { serverConfig } from "./config.js";
import { asyncHandler } from "./utils.js";
import clientes from "./routes/clientes.js";
import entregas from "./routes/entregas.js";
import usuarios from "./routes/usuarios.js";
import configuracoes from "./routes/configuracoes.js";
import produtos from "./routes/produtos.js";
import entregadores from "./routes/entregadores.js";

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: serverConfig.corsOrigin, credentials: true }));

// rota pública de healthcheck
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// ===== AUTH (usuário/senha) =====
app.post("/api/auth/login", asyncHandler(async (req, res) => {
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
    secure: serverConfig.nodeEnv === "production",
  });
  res.json({ ok: true, role: user.role });
}));

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("tg.session");
  res.json({ ok: true });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ email: req.user.email, role: req.user.role });
});

// ===== MÉTRICAS DASHBOARD =====
app.get("/api/metricas", requireAuth, asyncHandler(async (_req, res) => {
  // Total de pedidos
  const total = await query("SELECT COUNT(*) FROM topgas_entregas");
  
  // Finalizados (entregue ou Entregue)
  const finalizados = await query(
    "SELECT COUNT(*) FROM topgas_entregas WHERE status_pedido IN ('entregue', 'Entregue')"
  );
  
  // Em andamento (Em Entrega)
  const emAndamento = await query(
    "SELECT COUNT(*) FROM topgas_entregas WHERE status_pedido = 'Em Entrega'"
  );
  
  // Cancelados (cancelado ou Cancelado)
  const cancelados = await query(
    "SELECT COUNT(*) FROM topgas_entregas WHERE status_pedido IN ('cancelado', 'Cancelado')"
  );
  
  // Regiões
  const regioes = await query(
    `SELECT bairro, COUNT(*)::int AS total 
     FROM topgas_entregas 
     WHERE bairro IS NOT NULL 
     GROUP BY bairro 
     ORDER BY total DESC 
     LIMIT 20`
  );
  
  res.json({
    total_pedidos: Number(total.rows[0].count),
    finalizados: Number(finalizados.rows[0].count),
    em_andamento: Number(emAndamento.rows[0].count),
    cancelados: Number(cancelados.rows[0].count),
    // Manter compatibilidade com versão anterior
    total_entregas: Number(total.rows[0].count),
    entregas_sucesso: Number(finalizados.rows[0].count),
    cancelamentos: Number(cancelados.rows[0].count),
    regioes: regioes.rows,
  });
}));


// ===== ROTAS DE MÓDULOS =====
app.use("/api/clientes", requireAuth, clientes);
app.use("/api/entregas", requireAuth, entregas);
app.use("/api/produtos", requireAuth, produtos);
app.use("/api/entregadores", requireAuth, entregadores);
app.use("/api/usuarios", requireAuth, requireAdmin, usuarios);
app.use("/api/configuracoes", requireAuth, requireAdmin, configuracoes);

// ===== SERVE ESTÁTICO (DEV OPCIONAL) =====
if (serverConfig.serveStatic) {
  const __filename = url.fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const publicDir = path.resolve(__dirname, "../public");
  app.use(express.static(publicDir));
  // fallback para rotas não-API (SPA-like)
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
}

// Middleware de tratamento de erros global
app.use((error, req, res, next) => {
  console.error("Erro não tratado:", error);
  res.status(500).json({ 
    error: "Erro interno do servidor",
    details: serverConfig.nodeEnv === 'development' ? error.message : undefined
  });
});

const port = serverConfig.port;
app.listen(port, () => {
  console.log(`🚀 Servidor TopGas rodando na porta ${port}`);
  console.log(`📊 Ambiente: ${serverConfig.nodeEnv}`);
  console.log(`🌐 CORS Origin: ${serverConfig.corsOrigin}`);
  console.log(`📁 Serve Static: ${serverConfig.serveStatic}`);
});
