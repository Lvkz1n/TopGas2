import cookie from "cookie";
import bcrypt from "bcryptjs";
import { query } from "./db.js";

export async function createPasswordHash(plain) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function verifyCredentials(email, password) {
  // Consultar o usuário no banco de dados
  const { rows } = await query(
    "SELECT id, email, role, is_active, password_hash FROM usuarios WHERE email=$1",
    [email]
  );
  
  const u = rows[0];

  // Verifica se o usuário existe ou se a conta está inativa
  if (!u || !u.is_active) {
    console.log("Usuário não encontrado ou conta inativa.");
    return null;
  }

  // Verificar se a senha fornecida é válida
  const ok = await bcrypt.compare(password, u.password_hash || "");

  // Log para depuração da senha
  console.log(`Senha fornecida: ${password}`);
  console.log(`Senha armazenada: ${u.password_hash}`);
  console.log(`Senha válida: ${ok}`);

  if (!ok) {
    console.log("Senha inválida.");
    return null;
  }

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
