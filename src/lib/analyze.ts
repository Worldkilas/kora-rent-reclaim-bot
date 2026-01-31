import { eq } from "drizzle-orm";
import { address, createSolanaClient } from "gill";
import ora from "ora";
import { db, sponsoredAccounts } from "../db";
import { isTokenProgramOwner } from "./utils";

export async function analyze(rpcUrl: string = "localnet") {
  const { rpc } = createSolanaClient({
    urlOrMoniker: rpcUrl as any,
  });

  const spinner = ora("Loading pending accounts...").start();
  const inActiveMs = 30 * 24 * 60 * 60 * 1000;
  const LAMPORTS_PER_SOL = 1_000_000_000;

  // Get all pending accounts
  const pendingAccounts = await db.query.sponsoredAccounts.findMany({
    where: eq(sponsoredAccounts.status, "pending"),
  });

  if (pendingAccounts.length === 0) {
    spinner.info("No pending accounts found to analyze");
    console.log('💡 Run "kora scan" first to discover accounts');
    return;
  }
  spinner.text = `Analyzing ${pendingAccounts.length} accounts...`;
  let active = 0;
  let eligible = 0;
  let totalReclaimable = 0;

  for (const account of pendingAccounts) {
    spinner.text = `Analyzing ${pendingAccounts.length} accounts...`;
    try {
      const accountInfo = await rpc
        .getAccountInfo(address(account.address), {
          encoding: "jsonParsed",
          commitment: "confirmed",
        })
        .send();
      // Account doesn't exist = already closed, can't reclaim
      if (!accountInfo) {
        await db
          .update(sponsoredAccounts)
          .set({
            status: "pending",
            lastChecked: new Date(),
          })
          .where(eq(sponsoredAccounts.address, account.address));
        continue;
      }
      const lamports = accountInfo.value?.lamports;
      const sigs = await rpc
        .getSignaturesForAddress(address(account.address), { limit: 1 })
        .send();
      const lastActivity = sigs[0]?.blockTime
        ? new Date((sigs[0].blockTime as unknown as number) * 1000)
        : null;
      const inactive =
        !lastActivity || Date.now() - lastActivity.getTime() > inActiveMs;

      if (
        accountInfo.value?.owner &&
        isTokenProgramOwner(accountInfo.value.owner)
      ) {
        const parsedData = accountInfo.value?.data as any;
        const tokenAmount = parsedData.info?.tokenAmount?.amount ?? "0";
        if (tokenAmount === "0" && inactive) {
          await db
            .update(sponsoredAccounts)
            .set({
              status: "eligible",
              lastChecked: new Date(),
            })
            .where(eq(sponsoredAccounts.address, account.address));
          eligible++;
        } else {
          await db
            .update(sponsoredAccounts)
            .set({
              status: "active",
              lastChecked: new Date(),
            })
            .where(eq(sponsoredAccounts.address, account.address));
          active++;
        }
        continue;
      }
    } catch (e) {
      console.error(`❌ Failed ${account.address}`, e);
    }
    spinner.succeed("Analysis complete!");

    // Show results
    console.log("\n📊 Results:\n");
    console.log(`  Active (has data):       ${active}`);
    console.log(`  Eligible for reclaim:    ${eligible}`);
    console.log(
      `  Other:                   ${pendingAccounts.length - active - eligible}`,
    );

    if (eligible > 0) {
      const reclaimableSOL = (totalReclaimable / LAMPORTS_PER_SOL).toFixed(4);
      console.log(`\n💰 Total reclaimable: ${reclaimableSOL} SOL`);
      console.log(`\n✨ Run "kora reclaim" to recover this rent`);
    }

    return { active, eligible, totalReclaimable };
  }
}
