import dotenv from "dotenv";
import cookie from "cookie";
import bcrypt from "bcryptjs";
import { query } from "./db.js";
dotenv.config();

export async function createPasswordHash(plain) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function verifyCredentials(email, password) {
  // Consulta ao banco de dados para verificar o usuário
  const { rows } = await query(
    "SELECT id, email, role, is_active, password_hash FROM usuarios WHERE email=$1",
    [email]
  );
  
  const u = rows[0];

  // Verifica se o usuário existe ou se a conta está inativa
  if (!u || !u.is_active) return null;

  // Verifica se a senha fornecida é válida
  const ok = await bcrypt.compare(password, u.password_hash || "");

  if (!ok) return null;

  // Retorna os dados do usuário
  return { id: u.id, email: u.email, role: u.role };
}

export async function requireAuth(req, res, next) {
  try {
    const cookies = cookie.parse(req.headers.cookie || "");
    const session = cookies["tg.session"];
    if (!session) return res.status(401).json({ error: "unauthorized" });
    req.user = JSON.parse(Buffer.from(session, "base64").toString("utf8"));
    if (!req.user?.email)
      return res.status(401).json({ error: "unauthorized" });
    const { rows } = await query(
      "SELECT role, is_active FROM usuarios WHERE email=$1",
      [req.user.email]
    );
    if (!rows[0]?.is_active) return res.status(403).json({ error: "blocked" });
    req.user.role = rows[0].role;
    next();
  } catch (e) {
    res.status(401).json({ error: "unauthorized" });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin")
    return res.status(403).json({ error: "forbidden" });
  next();
}
