import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// This is our "Audit Trail" of sponsored accounts
export const sponsoredAccounts = sqliteTable("sponsored_accounts", {
  address: text("address").primaryKey(),
  txSignature: text("tx_signature").notNull(),
  slot: text("slot").notNull(),
  status: text("status")
    .$type<"pending" | "active" | "eligible" | "reclaimed">()
    .default("pending"),
  lastChecked: integer("last_checked", { mode: "timestamp" }),
  dataSize: integer("data_size"),
  lamports: integer("rent_lamports"),
  owner: text("owner"),
  reclaimTxSignature: text("reclaim_tx_signature"),
});

// This tracks where we are in the fee-payer's history
export const syncProgress = sqliteTable("sync_progress", {
  id: integer("id").primaryKey(),
  lastSignature: text("last_signature"),
});
