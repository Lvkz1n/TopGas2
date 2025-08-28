import dotenv from "dotenv";
import { query } from "./db.js";
import { createPasswordHash } from "./auth.js";

dotenv.config();

async function ensureAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@topgas.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  const { rows } = await query("SELECT id FROM usuarios WHERE email=$1", [
    adminEmail,
  ]);
  if (rows[0]?.id) {
    return;
  }
  const passwordHash = await createPasswordHash(adminPassword);
  await query(
    `INSERT INTO usuarios (email, nome, role, is_active, password_hash)
     VALUES ($1,$2,'admin',true,$3)`,
    [adminEmail, "Administrador", passwordHash]
  );
}

async function main() {
  await ensureAdminUser();
  console.log("Seed concluído.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


