#!/usr/bin/env node

import 'dotenv/config';
import { IssueAutomation } from './issue-automation.js';
import { Logger } from './logger.js';
import { loadConfig, validateConfig } from './config.js';

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
    // Setup graceful shutdown
    setupGracefulShutdown(logger);

    // Load and validate configuration
    logger.info('Loading configuration...');
    const config = loadConfig();
    validateConfig(config);
    logger.success('Configuration loaded successfully');

    // Initialize automation
    const automation = new IssueAutomation(config, logger);

    if (config.daemonMode) {
      // Run in daemon mode
      await runDaemon(logger, automation, config.daemonInterval);
      
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

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}