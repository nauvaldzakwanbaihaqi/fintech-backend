import { db } from "./db/main";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { accounts, transactions, ledgerEntries } from "./db/schema";

async function runningStressTest() {
  console.log("🚀 Membersihkan Database untuk Stress Test... \n");

  db.delete(ledgerEntries).run();
  db.delete(transactions).run();
  db.delete(accounts).run();

  console.log("✅ Database Bersih! Memulai Stress Test...");

  const nauvalId = randomUUID();
  const budiId = randomUUID();
  const feeId = randomUUID();

  db.insert(accounts)
    .values([
      { id: nauvalId, name: "Nauval", type: "LIABILITY", balance: 100000 },
      { id: budiId, name: "Budi", type: "LIABILITY", balance: 0 },
      { id: feeId, name: "Fee", type: "REVENUE", balance: 0 },
    ])
    .run();

  console.log("Saldo Awal Nauval: Rp100.000");
  console.log(
    "Mencoba 10 Transfer Simultaen (Rp10.000 + Rp1.000 Fee = Rp11.000 per request)...\n",
  );

  // ARRAY TRANSFER 10 KALI, YANG KE SEPULUH HARUSNYA GAGAL
  const requests = Array.from({ length: 10 }).map((_, index) => {
    const reqNumber = index + 1;
    return fetch("http://localhost:3000/api/v1/transfer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-idempotency-Key": `STRESS-KEY-${reqNumber}`,
      },
      body: JSON.stringify({
        sourceAccountId: nauvalId,
        destinationAccountId: budiId,
        feeAccountId: feeId,
        amount: 10000,
        adminFee: 1000,
        description: `Stress Test #${reqNumber}`,
      }),
    }).then((res) => res.json());
  });

  const results = await Promise.all(requests);

  console.log("📊 HASIL RESPON DARI 10 REQUEST PARALEL:\n");
  results.forEach((res, i) => {
    const statusIcon = res.status === "SUCCESS" ? "✅" : "❌";
    console.log(
      `${statusIcon} Req #${i + 1}: [${res.status}] ${res.message || ""}`,
    );
  });

  // 4. Verifikasi Saldo Akhir di Database
  const finalNauval = db
    .select()
    .from(accounts)
    .where(eq(accounts.id, nauvalId))
    .get();
  const finalBudi = db
    .select()
    .from(accounts)
    .where(eq(accounts.id, budiId))
    .get();
  const finalFee = db
    .select()
    .from(accounts)
    .where(eq(accounts.id, feeId))
    .get();

  console.log("\n==================================================");
  console.log("🛡️ VERIFIKASI INTEGRITAS SALDO DB SELESAI:");
  console.log(
    `- Saldo Akhir Nauval : Rp${finalNauval?.balance} (Versi: v${finalNauval?.version})`,
  );
  console.log(`- Saldo Akhir Budi   : Rp${finalBudi?.balance}`);
  console.log(`- Total Revenue Fee  : Rp${finalFee?.balance}`);
  console.log("==================================================");
}
runningStressTest();
