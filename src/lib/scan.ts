import { address, createSolanaClient, type Address, type Signature ,} from "gill";
import { db, sponsoredAccounts, syncProgress } from "../db";
import { eq } from "drizzle-orm";
import { isSystemCreateAccountParsedInstruction } from "../typedefs/system_create_account";
import ora from "ora";

const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";

// System Program instruction discriminators
const CREATE_ACCOUNT = 0;

export async function scan(feePayerStr: string){
    const {rpc}=createSolanaClient({
        urlOrMoniker: 'localnet'
    })
    const feePayer:Address<string>=address(feePayerStr)

    const progress=await db.query.syncProgress.findFirst({
        where:eq(syncProgress.id,1)
    })

    let beforeSig= progress?.lastSignature as Signature | undefined
    const spinner = ora(
        beforeSig 
        ? `🔄 Resuming from ${beforeSig.slice(0, 8)}...` 
        : "🚀 Starting fresh scan..."
    ).start();

    let totalFound = 0;

    

    while(true){
        const signatures= await rpc.getSignaturesForAddress(feePayer,{
            before: beforeSig,
            limit:1000
        }).send()
        if (signatures.length === 0) {
            spinner.succeed("🏁 History fully synced");
            break;
        }
      

        for(const sigInfo of signatures){
            beforeSig=sigInfo.signature as Signature
            if (sigInfo.err) continue;
            const tx= await withRetry(
                ()=>rpc.getTransaction(sigInfo.signature,{
                    maxSupportedTransactionVersion:0,
                    encoding:"jsonParsed",
                    commitment:'confirmed',
                }).send()
            )
            if (!tx?.meta) continue;
            const instructions = tx.transaction.message.instructions ;

            for(const ix of instructions){
                if(!isSystemCreateAccountParsedInstruction(ix)) continue;

                const {newAccount,owner,space,lamports}=ix.parsed.info
                
                await db.insert(sponsoredAccounts).values({
                    address: newAccount,
                    txSignature:sigInfo.signature,
                    slot:String(sigInfo.slot),
                    status:'pending',
                    owner,
                    dataSize:space,
                    lamports
                }).onConflictDoNothing();
                 totalFound++;
            }
        }
       spinner.text = `📡 Found ${totalFound} accounts...`;
    }

    // Persist checkpoint after batch finishes
    await db.insert(syncProgress).values({
        id:1,
        lastSignature:beforeSig,

    }).onConflictDoUpdate({
        target: syncProgress.id,
        set:{
            lastSignature:beforeSig
        }
    })
    spinner.text = `📡 Found ${totalFound} accounts...`;
    return totalFound;
}

async function withRetry<T>(fn:()=>Promise<T>, retries=3):Promise<T> {
    let lastErr;
    for(let i=0;i<retries;i++){
        try {
            return await fn()
        } catch (err) {
            lastErr=err
            await new Promise(r => setTimeout(r, 500 * (i + 1)));
        }
    }
    throw lastErr
}
