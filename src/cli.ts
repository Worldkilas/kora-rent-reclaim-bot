import { Command } from 'commander';
import chalk from 'chalk';
import { scan } from './lib/scan';
import { analyze } from './lib/analyze';
import { reclaim } from './lib/reclaim';
import { showStats, resetDatabase } from './lib/show_stats';
import { loadConfig } from './lib/config';


const program = new Command();

console.log(chalk.cyan.bold(`
╔═══════════════════════════════════════╗
║      KORA RENT RECLAIM BOT           ║
║   Automated Rent Recovery Tool       ║
╚═══════════════════════════════════════╝
`));

program
  .name('kora')
  .description('Automated rent reclaim bot for Kora-sponsored Solana accounts')
  .version('1.0.0');

// SCAN command
program
  .command('scan')
  .description('Scan fee-payer history for sponsored accounts')
  .option('-f, --fee-payer <address>', 'Fee payer address (Kora operator)')
  
  .action(async (options) => {
    try {
      const config = await loadConfig();
      const feePayer = options.feePayer || config.feePayer;

      if (!feePayer) {
        console.error(chalk.red('Error: Fee payer address is required. Provide it via --fee-payer, kora.toml, or KORA_FEE_PAYER env var.'));
        process.exit(1);
      }

      await scan(feePayer);
    } catch (error) {
      console.error(chalk.red('Scan failed:'), error);
      process.exit(1);
    }
  });

// ANALYZE command
program
  .command('analyze')
  .description('Check status of discovered accounts')
  .option('-r, --rpc <url>', 'RPC URL')
  .action(async (options) => {
    try {
      const config = await loadConfig();
      const rpcUrl = options.rpc || config.rpcUrl || 'localnet';

      await analyze(rpcUrl);
    } catch (error) {
      console.error(chalk.red('Analysis failed:'), error);
      process.exit(1);
    }
  });

// RECLAIM command
program
  .command('reclaim')
  .description('Reclaim rent from eligible accounts')
  .option('-k, --keypair <path>', 'Operator keypair path')
  .option('-t, --treasury <address>', 'Treasury address')
  .option('-r, --rpc <url>', 'RPC URL')
  .option('--dry-run', 'Simulate without sending transactions', false)
  .action(async (options) => {
    try {
      const config = await loadConfig();
      const keypair = options.keypair || config.keypairPath;
      const treasury = options.treasury || config.treasuryAddress;
      const rpcUrl = options.rpc || config.rpcUrl || 'localnet';

      if (!keypair) {
        console.error(chalk.red('Error: Keypair path is required. Provide it via --keypair, kora.toml, or KORA_KEYPAIR_PATH env var.'));
        process.exit(1);
      }
      if (!treasury) {
        console.error(chalk.red('Error: Treasury address is required. Provide it via --treasury, kora.toml, or KORA_TREASURY env var.'));
        process.exit(1);
      }

      await reclaim(
        keypair,
        treasury,
        rpcUrl,
        options.dryRun
      );
    } catch (error) {
      console.error(chalk.red('Reclaim failed:'), error);
      process.exit(1);
    }
  });

// STATS command
program
  .command('stats')
  .description('Show statistics')
  .action(async () => {
    try {
      await showStats();
    } catch (error) {
      console.error(chalk.red('Stats failed:'), error);
      process.exit(1);
    }
  });

// RESET command
program
  .command('reset')
  .description('Reset database (WARNING: deletes all data)')
  .option('--confirm', 'Confirm reset', false)
  .action(async (options) => {
    if (!options.confirm) {
      console.log(chalk.yellow('⚠️  Use --confirm to reset database'));
      return;
    }
    try {
      await resetDatabase();
    } catch (error) {
      console.error(chalk.red('Reset failed:'), error);
      process.exit(1);
    }
  });

program.parse();