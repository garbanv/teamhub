import "./load-env";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { pool } from "../lib/db";

async function reset() {
  const database = new URL(process.env.DATABASE_URL!).pathname.replace(/^\//, "");
  console.log(`\nThis will permanently delete all data in database: ${database}`);
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to reset a database with NODE_ENV=production.");
  }

  if (process.env.ALLOW_DB_RESET !== "1") {
    const rl = createInterface({ input: stdin, output: stdout });
    const answer = await rl.question(`Type "${database}" to continue: `);
    rl.close();
    if (answer.trim() !== database) {
      console.log("Cancelled.");
      return;
    }
  }

  await pool.query("drop schema public cascade");
  await pool.query("create schema public");
  console.log(`\nReset ${database}. Run \`pnpm db:migrate && pnpm db:seed\` next.`);
  await pool.end();
}

reset().catch(async (error) => {
  console.error(error);
  await pool.end().catch(() => {});
  process.exit(1);
});
