/**
 * GitHub Issue automation script types
 */

export interface IGitHubIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: IGitHubLabel[];
  created_at: string;
  updated_at: string;
}

export interface IGitHubLabel {
  id: number;
  name: string;
  color: string;
  description?: string;
}

export interface IGitHubComment {
  id: number;
  body: string;
  created_at: string;
  updated_at: string;
  user: {
    login: string;
  };
}

export interface IAutomationConfig {
  owner: string;
  repo: string;
  token: string;
  taskLabel: string;
  doingLabel: string;
  maxIssuesPerRun: number;
  commentTemplate: string;
  // Daemon mode configuration
  daemonMode: boolean;
  daemonInterval: number; // in milliseconds
}

export interface IAutomationResult {
  success: boolean;
  processedIssue?: {
    number: number;
    title: string;
  };
  message: string;
  timestamp: string;
}

export interface ILogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  success(message: string): void;
}