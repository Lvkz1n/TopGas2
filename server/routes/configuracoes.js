import { Router } from "express";
import { query } from "../db.js";

const r = Router();

r.get("/", async (_req, res) => {
  const { rows } = await query(
    "SELECT id, key, value FROM configuracoes ORDER BY key ASC"
  );
  res.json(rows);
});

r.post("/", async (req, res) => {
  const { key, value } = req.body || {};
  if (!key) return res.status(400).json({ error: "missing_key" });

  const { rows } = await query(
    `INSERT INTO configuracoes (key, value)
     VALUES ($1,$2)
     ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value
     RETURNING id, key, value`,
    [key, value ?? ""]
  );
  res.json(rows[0]);
});

r.delete("/:key", async (req, res) => {
  const k = req.params.key;
  await query("DELETE FROM configuracoes WHERE key=$1", [k]);
  res.status(204).end();
});

export default r;
