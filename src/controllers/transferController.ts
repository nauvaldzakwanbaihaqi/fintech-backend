import { db } from "../db/main.js";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { Request, Response } from "express";
import { accounts, transactions, ledgerEntries } from "../db/schema.js";

export async function handleTransfer(req: Request, res: Response) {
  const idempotencyKey = req.headers["x-idempotency-key"] as string;
  const {
    sourceAccountId,
    destinationAccountId,
    feeAccountId,
    amount,
    adminFee,
    description,
  } = req.body;

  const totalDeduction = Number(amount) + Number(adminFee);

  try {
    const result = db.transaction((tx) => {
      // 1. Idempotency Check
      const existingTx = tx
        .select()
        .from(transactions)
        .where(eq(transactions.idempotencyKey, idempotencyKey))
        .get();

      if (existingTx) {
        return {
          isDuplicate: true,
          transaction: existingTx,
        };
      }

      // 2. Read & Validate 3 Akun (Source, Destination, Fee)
      // sourceAcc
      const sourceAcc = tx
        .select()
        .from(accounts)
        .where(eq(accounts.id, sourceAccountId))
        .get();

      if (!sourceAcc || sourceAcc.balance < totalDeduction) {
        throw new Error(
          "Saldo Pengirim Tidak Cukup untuk Transfer + Biaya Admin!",
        );
      }

      // destinationAcc
      const destAcc = tx
        .select()
        .from(accounts)
        .where(eq(accounts.id, destinationAccountId))
        .get();

      if (!destAcc) throw new Error("Akun Tujuan Tidak Ditemukan!");

      // feeAcc
      const feeAcc = tx
        .select()
        .from(accounts)
        .where(eq(accounts.id, feeAccountId))
        .get();

      if (!feeAcc) throw new Error("Akun Fee Tidak Ditemukan!");

      // Insert Transaction Record
      const transactionId = randomUUID();
      tx.insert(transactions)
        .values({
          id: transactionId,
          idempotencyKey,
          description: description || "Transfer Via REST API",
        })
        .run();

      // 4. Insert 3 Jurnal Ledger
      tx.insert(ledgerEntries)
        .values([
          {
            id: randomUUID(),
            transactionId,
            accountId: sourceAccountId,
            direction: "DEBIT",
            amount: totalDeduction,
          },
          {
            id: randomUUID(),
            transactionId,
            accountId: destinationAccountId,
            direction: "CREDIT",
            amount: Number(amount),
          },
          {
            id: randomUUID(),
            transactionId,
            accountId: feeAccountId,
            direction: "CREDIT",
            amount: Number(adminFee),
          },
        ])
        .run();

      // 5. Update Saldo 3 Akun
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
      if (updatedSource.changes === 0)
        throw new Error("RACE CONDITION: Akun pengirim telah diubah!");

      const updatedDest = tx
        .update(accounts)
        .set({
          balance: destAcc.balance + Number(amount),
          version: destAcc.version + 1,
        })
        .where(
          and(
            eq(accounts.id, destinationAccountId),
            eq(accounts.version, destAcc.version),
          ),
        )
        .run();
      if (updatedDest.changes === 0)
        throw new Error("RACE CONDITION: Akun penerima telah diubah!");

      const updatedFee = tx
        .update(accounts)
        .set({
          balance: feeAcc.balance + Number(adminFee),
          version: feeAcc.version + 1,
        })
        .where(
          and(
            eq(accounts.id, feeAccountId),
            eq(accounts.version, feeAcc.version),
          ),
        )
        .run();
      if (updatedFee.changes === 0)
        throw new Error("RACE CONDITION: Akun fee telah diubah!");

      return {
        isDuplicate: false,
        transactionId,
      };
    });

    if (result.isDuplicate) {
      return res.status(200).json({
        status: "DUPLICATE_IGNORED",
        message:
          "Transaksi dengan idempotencyKey ini sudah diproses sebelumnya.",
        data: result.transaction,
      });
    }

    return res.status(200).json({
      status: "SUCCESS",
      message: "Transaksi Transfer Berhasil Diproses!",
      transactionId: result.transactionId,
    });
  } catch (error: any) {
    return res.status(400).json({
      status: "FAILED",
      message: error.message,
    })
  }
}
