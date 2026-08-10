import { db } from "./db/main.js";
import { accounts, ledgerEntries, transactions } from "./db/schema.js";
import { randomUUID } from "crypto";

function seed() {
  console.log("🌱 Seeding database...\n");

  // Bersihkan data lama
  db.delete(ledgerEntries).run();
  db.delete(transactions).run();
  db.delete(accounts).run();

  // Generate UUID Unik
  const nauvalId = randomUUID();
  const budiId = randomUUID();
  const feeId = randomUUID();

  // Insert 3 Akun Tes
  db.insert(accounts)
    .values([
      { id: nauvalId, name: "User Nauval", type: "LIABILITY", balance: 100000 },
      { id: budiId, name: "Merchant Budi", type: "LIABILITY", balance: 0 },
      { id: feeId, name: "System Fee", type: "REVENUE", balance: 0 },
    ])
    .run();

  console.log("✅ Seeding Berhasil! Copy ID di bawah ini untuk cURL:\n");
  console.log(`sourceAccountId      (Nauval) : ${nauvalId}`);
  console.log(`destinationAccountId (Budi)   : ${budiId}`);
  console.log(`feeAccountId         (Fee)    : ${feeId}\n`);
}

seed();
