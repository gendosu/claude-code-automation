#!/usr/bin/env node

import 'dotenv/config';
import { IssueAutomation } from './issue-automation.js';
import { Logger } from './logger.js';
import { loadConfig, validateConfig } from './config.js';

// CLI argument parsing
function parseArguments(): { daemon: boolean; interval?: number; help: boolean } {
  const args = process.argv.slice(2);
  const result: { daemon: boolean; interval?: number; help: boolean } = { daemon: false, interval: undefined, help: false };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--daemon' || arg === '-d') {
      result.daemon = true;
    } else if (arg === '--interval' || arg === '-i') {
      const intervalArg = args[++i];
      if (intervalArg && !isNaN(Number(intervalArg))) {
        result.interval = Number(intervalArg) * 1000; // Convert to milliseconds
      } else {
        throw new Error('Invalid interval value. Please provide a number in seconds.');
      }
    } else if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  
  return result;
}

function showHelp(): void {
  console.log(`
Usage: npx claude-code-automation [options]

Options:
  --daemon, -d          Run in daemon mode (continuous monitoring)
  --interval, -i <sec>  Set daemon interval in seconds (default: 300)
  --help, -h           Show this help message

Examples:
  npx claude-code-automation              # Run once
  npx claude-code-automation --daemon     # Run in daemon mode
  npx claude-code-automation -d -i 600    # Run daemon with 10-minute interval
  `);
}

// Global variables for daemon mode
let isShuttingDown = false;
let daemonTimer: NodeJS.Timeout | null = null;

/**
 * Single automation run
 */
async function runAutomation(logger: Logger, automation: IssueAutomation): Promise<void> {
  try {
    const result = await automation.run();
    const summary = automation.generateSummary(result);
    console.log('\n' + summary);
  } catch (error) {
    logger.error(`Automation run failed: ${error}`);
  }
}

/**
 * Daemon mode execution
 */
async function runDaemon(logger: Logger, automation: IssueAutomation, intervalMs: number): Promise<void> {
  logger.info(`🔄 Daemon mode started. Running every ${intervalMs / 1000} seconds`);
  logger.info('Press Ctrl+C to stop gracefully');

  // Run initial automation
  await runAutomation(logger, automation);

  // Schedule recurring runs
  const scheduleNext = () => {
    if (!isShuttingDown) {
      daemonTimer = setTimeout(async () => {
        if (!isShuttingDown) {
          logger.info(`⏰ Running scheduled automation check...`);
          await runAutomation(logger, automation);
          scheduleNext(); // Schedule next run
        }
      }, intervalMs);
    }
  };

  scheduleNext();
}

/**
 * Main entry point for GitHub Issue automation script
 */
async function main(): Promise<void> {
  const logger = new Logger();
  
  try {
    // Parse CLI arguments
    const cliArgs = parseArguments();
    
    // Show help if requested
    if (cliArgs.help) {
      showHelp();
      process.exit(0);
    }
    
    // Setup graceful shutdown
    setupGracefulShutdown(logger);

    // Load and validate configuration
    logger.info('Loading configuration...');
    const config = loadConfig();
    validateConfig(config);
    logger.success('Configuration loaded successfully');

    // Override daemon mode and interval from CLI arguments
    const finalDaemonMode = cliArgs.daemon || config.daemonMode;
    const finalInterval = cliArgs.interval || config.daemonInterval;

    // Initialize automation
    const automation = new IssueAutomation(config, logger);

    if (finalDaemonMode) {
      // Run in daemon mode
      await runDaemon(logger, automation, finalInterval);
      
      // Keep process alive in daemon mode
      return new Promise(() => {
        // This promise never resolves, keeping the process alive
        // until graceful shutdown is triggered
      });
    } else {
      // Run once and exit
      const result = await automation.run();
      const summary = automation.generateSummary(result);
      console.log('\n' + summary);
      process.exit(result.success ? 0 : 1);
    }

  } catch (error) {
    if (error instanceof Error && error.message.includes('Unknown argument')) {
      console.error(`Error: ${error.message}`);
      console.error('Use --help for usage information.');
      process.exit(1);
    }
    
    logger.error(`Fatal error: ${error}`);
    console.error('\n## 🤖 Issue Automation Summary');
    console.error('');
    console.error('- Status: ❌ **Fatal Error**');
    console.error(`- Error: ${error}`);
    console.error(`- Timestamp: ${new Date().toISOString()}`);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
function setupGracefulShutdown(logger: Logger): void {
  const shutdown = (signal: string) => {
    if (isShuttingDown) {
      logger.warn('Force shutdown...');
      process.exit(1);
    }

    isShuttingDown = true;
    logger.info(`\n🛑 Received ${signal}. Shutting down gracefully...`);

    if (daemonTimer) {
      clearTimeout(daemonTimer);
      daemonTimer = null;
      logger.info('Canceled pending automation timer');
    }

    logger.success('Shutdown complete');
    process.exit(0);
  };

  // Handle various shutdown signals
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGQUIT', () => shutdown('SIGQUIT'));
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the main function
main();