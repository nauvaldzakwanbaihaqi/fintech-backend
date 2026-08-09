import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// 1. Akun Pembukuan (Kas, Saldo User, Pendapatan)
export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'ASSET', 'LIABILITY', 'REVENUE', 'EXPENSE'
  balance: integer("balance").notNull().default(0),
  version: integer("version").notNull().default(0), // Untuk Optimistic Locking
});

// 2. Header Transaksi (Dilengkapi Idempotency Key)
export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  idempotencyKey: text("idempotency_key").notNull().unique(), // Unique constraint mencegah double spending
  description: text("description").notNull(),
});

// 3. Entri Jurnal Double-Entry (Debit & Kredit)
export const ledgerEntries = sqliteTable("ledger_entries", {
  id: text("id").primaryKey(),
  transactionId: text("transaction_id")
    .notNull()
    .references(() => transactions.id),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  direction: text("direction").notNull(), // 'DEBIT' atau 'CREDIT'
  amount: integer("amount").notNull(),
});
