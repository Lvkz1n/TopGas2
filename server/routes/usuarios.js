import { Router } from "express";
import { query } from "../db.js";
import { createPasswordHash } from "../auth.js";

const r = Router();

r.get("/", async (_req, res) => {
  const { rows } = await query(
    "SELECT id, email, nome, role, is_active, created_at FROM usuarios ORDER BY id DESC"
  );
  res.json(rows);
});

r.post("/", async (req, res) => {
  const {
    email,
    nome,
    role = "user",
    password,
    is_active = true,
  } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: "missing_fields" });
  if (!["admin", "user"].includes(role))
    return res.status(400).json({ error: "invalid_role" });

  const hash = await createPasswordHash(password);
  try {
    const { rows } = await query(
      `INSERT INTO usuarios (email, nome, role, is_active, password_hash)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, email, nome, role, is_active, created_at`,
      [email, nome || null, role, !!is_active, hash]
    );
    res.json(rows[0]);
  } catch (e) {
    if (String(e.message).includes("duplicate")) {
      return res.status(409).json({ error: "email_exists" });
    }
    throw e;
  }
});

r.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { nome, role, is_active } = req.body || {};
  if (role && !["admin", "user"].includes(role)) {
    return res.status(400).json({ error: "invalid_role" });
  }
  const { rows } = await query(
    `UPDATE usuarios
       SET nome = COALESCE($1, nome),
           role = COALESCE($2, role),
           is_active = COALESCE($3, is_active)
     WHERE id=$4
     RETURNING id, email, nome, role, is_active, created_at`,
    [nome ?? null, role ?? null, is_active ?? null, id]
  );
  if (!rows[0]) return res.status(404).json({ error: "not_found" });
  res.json(rows[0]);
});

r.post("/:id/set-password", async (req, res) => {
  const id = Number(req.params.id);
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: "missing_password" });

  const hash = await createPasswordHash(password);
  const { rowCount } = await query(
    "UPDATE usuarios SET password_hash=$1 WHERE id=$2",
    [hash, id]
  );
  if (!rowCount) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
});

r.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await query("DELETE FROM usuarios WHERE id=$1", [id]);
  res.status(204).end();
});

export default r;
