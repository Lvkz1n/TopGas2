import fs from "fs";
import path from "path";
import url from "url";
import dotenv from "dotenv";
import { pool } from "./db.js";

dotenv.config();

async function applySchema() {
  const __filename = url.fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const schemaPath = path.join(__dirname, "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  await pool.query(sql);
}

async function main() {
  await applySchema();
  console.log("Schema aplicado com sucesso.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Falha ao aplicar schema:", err.message);
  process.exit(1);
});


