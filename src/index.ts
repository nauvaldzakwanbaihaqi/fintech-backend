import { db } from "./db/main.js";
import { accounts, transactions, ledgerEntries } from "./db/schema.js";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

/**
 * LOGIC TRANSAKSI FINTECH ENTERPRISE (DRIZZLE ORM + BETTER-SQLITE3)
 */
export function processFintechTransaction(params: {
  idempotencyKey: string;
  description: string;
  sourceAccountId: string;
  destinationAccountId: string;
  feeAccountId: string;
  amount: number;
  adminFee: number;
}) {
  const {
    idempotencyKey,
    description,
    sourceAccountId,
    destinationAccountId,
    feeAccountId,
    amount,
    adminFee,
  } = params;

  const totalDeduction = amount + adminFee;

  return db.transaction((tx) => {
    // 1. IDEMPOTENCY CHECK (Gunakan .select().from().where().get())
    const existingTx = tx
      .select()
      .from(transactions)
      .where(eq(transactions.idempotencyKey, idempotencyKey))
      .get();

    if (existingTx) {
      console.log(
        `🟡 [IDEMPOTENCY] Key '${idempotencyKey}' sudah diproses sebelumnya. Mengembalikan data transaksi tanpa potong saldo.`,
      );
      return { status: "DUPLICATE_IGNORED", transaction: existingTx };
    }

    // 2. READ & VALIDATE SALDO PENGIRIM
    const sourceAcc = tx
      .select()
      .from(accounts)
      .where(eq(accounts.id, sourceAccountId))
      .get();

    if (!sourceAcc || sourceAcc.balance < amount) {
      throw new Error("Saldo Pengirim Tidak Cukup!");
    }

    const feeAcc = tx
      .select()
      .from(accounts)
      .where(eq(accounts.id, params.feeAccountId))
      .get();

    if (!feeAcc) {
      throw new Error("Akun Biaya Admin Tidak Ditemukan!")
    }

    if (!sourceAcc || sourceAcc.balance < totalDeduction) {
      throw new Error(
        "Saldo Pengirim Tidak Cukup untuk Transfer + Biaya Admin!",
      );
    }
    
    // 3. READ AKUN PENERIMA
    const destAcc = tx
      .select()
      .from(accounts)
      .where(eq(accounts.id, destinationAccountId))
      .get();

    if (!destAcc) throw new Error("Akun Tujuan Tidak Ditemukan!");

    // 4. INSERT HEADER TRANSAKSI
    const transactionId = randomUUID();
    tx.insert(transactions)
      .values({
        id: transactionId,
        idempotencyKey,
        description,
      })
      .run();

    // 5. INSERT JURNAL DOUBLE-ENTRY (DEBIT & CREDIT)
    tx.insert(ledgerEntries)
      .values([
        {
          id: randomUUID(),
          transactionId,
          accountId: sourceAccountId,
          direction: "DEBIT",
          amount: amount + adminFee,
        },
        {
          id: randomUUID(),
          transactionId,
          accountId: destinationAccountId,
          direction: "CREDIT",
          amount,
        },
        {
          id: randomUUID(),
          transactionId,
          accountId: feeAccountId,
          direction: "CREDIT",
          amount: adminFee,
        },
      ])
      .run();

    // 6. UPDATE SALDO PENGIRIM (OPTIMISTIC LOCKING)
    const updatedSource = tx
      .update(accounts)
      .set({
        balance: sourceAcc.balance - totalDeduction,
        version: sourceAcc.version + 1,
      })
      .where(
        and(
          eq(accounts.id, sourceAccountId),
          eq(accounts.version, sourceAcc.version),
        ),
      )
      .run();

    if (updatedSource.changes === 0) {
      throw new Error(
        "RACE CONDITION DETECTED: Data akun pengirim telah diubah!",
      );
    }

    // 7. UPDATE SALDO PENERIMA (OPTIMISTIC LOCKING)
    const updatedDest = tx
      .update(accounts)
      .set({
        balance: destAcc.balance + amount,
        version: destAcc.version + 1,
      })
      .where(
        and(
          eq(accounts.id, destinationAccountId),
          eq(accounts.version, destAcc.version),
        ),
      )
      .run();

    const updatedFee = tx
      .update(accounts)
      .set({
        balance: feeAcc.balance + adminFee,
        version: feeAcc.version + 1,
      })
      .where( 
        and(
          eq(accounts.id, feeAccountId),
          eq(accounts.version, feeAcc.version),
        ),
      )
      .run();

    if (updatedFee.changes === 0) {
      throw new Error(
        "RACE CONDITION DETECTED: Data akun fee telah diubah!",
      );
    }

    if (updatedDest.changes === 0) {
      throw new Error(
        "RACE CONDITION DETECTED: Data akun penerima telah diubah!",
      );
    }

    console.log(
      `✅ [SUCCESS] ${description} sebesar Rp${amount} Berhasil! (Admin Fee: Rp${adminFee})`,
    );
    return { status: "SUCCESS", transactionId };
  });
}

// MAIN SIMULATOR
function main() {
  console.log("=== PREPARING ENTERPRISE FINTECH DATABASE ===\n");

  // Reset database
  db.delete(ledgerEntries).run();
  db.delete(transactions).run();
  db.delete(accounts).run();

  // Buat 2 Akun Tes
  const nauvalId = randomUUID();
  const budiId = randomUUID();
  const systemFeeId = randomUUID();

  db.insert(accounts)
    .values([
      {
        id: nauvalId,
        name: "User Nauval (Liability)",
        type: "LIABILITY",
        balance: 100000,
      },
      {
        id: budiId,
        name: "Merchant Budi (Liability)",
        type: "LIABILITY",
        balance: 0,
      },
      {
        id: systemFeeId,
        name: "System Fee (Revenue)",
        type: "REVENUE",
        balance: 0,
      },
    ])
    .run();

  console.log("Saldo Awal:");
  console.log(`- Nauval    : Rp100.000`);
  console.log(`- Merchant  : Rp0`);
  console.log(`- Bank Fee  : Rp0\n`);

  // SKENARIO 1: Transaksi Normal Transfer Rp50.000
  console.log("--- SKENARIO 1: Transfer Rp50.000 ---");
  processFintechTransaction({
    idempotencyKey: "PAYMENT-KEY-999",
    description: "Pembayaran Belanja ke Merchant Budi",
    sourceAccountId: nauvalId,
    destinationAccountId: budiId,
    feeAccountId: systemFeeId,
    amount: 50000,
    adminFee: 2500,
  });

  // SKENARIO 2: Duplicate Key (Idempotency Key Sama)
  console.log(
    "\n--- SKENARIO 2: User Pencet Tombol Bayar Lagi (Duplicate Key) ---",
  );
  processFintechTransaction({
    idempotencyKey: "PAYMENT-KEY-999",
    description: "Pembayaran Belanja ke Merchant Budi",
    sourceAccountId: nauvalId,
    destinationAccountId: budiId,
    feeAccountId: systemFeeId,
    amount: 50000,
    adminFee: 2500,
  });

  // Cek Saldo Akhir
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
    .where(eq(accounts.id, systemFeeId))
    .get();

  console.log(`\n==================================================`);
  console.log(`🛡️ SALDO AKHIR:`);
  console.log(`- Nauval   : Rp${finalNauval?.balance} (Harusnya Rp47.500)`);
  console.log(`- Merchant : Rp${finalBudi?.balance} (Harusnya Rp50.000)`);
  console.log(`- Bank Fee : Rp${finalFee?.balance} (Harusnya Rp2.500)`);
  console.log(`==================================================`);
}

main();
