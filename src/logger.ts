import { ILogger } from './types.js';

/**
 * Simple console logger with colored output
 */
export class Logger implements ILogger {
  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }

  info(message: string): void {
    console.log(`ℹ️  ${this.formatMessage('INFO', message)}`);
  }

  warn(message: string): void {
    console.warn(`⚠️  ${this.formatMessage('WARN', message)}`);
  }

  error(message: string): void {
    console.error(`❌ ${this.formatMessage('ERROR', message)}`);
  }

  success(message: string): void {
    console.log(`✅ ${this.formatMessage('SUCCESS', message)}`);
  }
}