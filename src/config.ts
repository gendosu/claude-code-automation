import { IAutomationConfig } from './types.js';

/**
 * Load configuration from environment variables
 */
export function loadConfig(): IAutomationConfig {
  // Required environment variables
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || 'xxx';
  const repo = process.env.GITHUB_REPO || 'xxx';

  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }

  // Optional configuration with defaults
  const taskLabel = process.env.TASK_LABEL || 'ai task';
  const doingLabel = process.env.DOING_LABEL || 'ai doing';
  const maxIssuesPerRun = parseInt(process.env.MAX_ISSUES_PER_RUN || '10', 10);
  const commentTemplate = process.env.COMMENT_TEMPLATE || '@claude /note-issue-task-run #{{issue_number}}';
  
  // Daemon mode configuration
  const daemonMode = process.env.DAEMON_MODE === 'true' || process.argv.includes('--daemon');
  const daemonInterval = parseInt(process.env.DAEMON_INTERVAL || '300000', 10); // Default: 5 minutes

  return {
    owner,
    repo,
    token,
    taskLabel,
    doingLabel,
    maxIssuesPerRun,
    commentTemplate,
    daemonMode,
    daemonInterval,
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: IAutomationConfig): void {
  const requiredFields = ['owner', 'repo', 'token', 'taskLabel', 'doingLabel'];
  
  for (const field of requiredFields) {
    if (!config[field as keyof IAutomationConfig]) {
      throw new Error(`Configuration field '${field}' is required`);
    }
  }

  if (config.maxIssuesPerRun <= 0) {
    throw new Error('maxIssuesPerRun must be a positive number');
  }

  if (!config.commentTemplate.includes('{{issue_number}}')) {
    throw new Error('commentTemplate must include {{issue_number}} placeholder');
  }

  if (config.daemonInterval <= 0) {
    throw new Error('daemonInterval must be a positive number');
  }
}