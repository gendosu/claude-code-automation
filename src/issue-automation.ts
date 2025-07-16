import { GitHubClient } from './github-client.js';
import { IAutomationConfig, IAutomationResult, IGitHubIssue, ILogger } from './types.js';

/**
 * Main issue automation logic that replicates GitHub Actions workflow
 */
export class IssueAutomation {
  private githubClient: GitHubClient;
  private config: IAutomationConfig;
  private logger: ILogger;

  constructor(config: IAutomationConfig, logger: ILogger) {
    this.config = config;
    this.logger = logger;
    this.githubClient = new GitHubClient(config, logger);
  }

  /**
   * Main automation process - replicates the GitHub Actions workflow
   */
  async run(): Promise<IAutomationResult> {
    const timestamp = new Date().toISOString();
    
    try {
      this.logger.info('🤖 Starting GitHub Issue Automation');
      this.logger.info(`Repository: ${this.config.owner}/${this.config.repo}`);
      this.logger.info(`Task Label: ${this.config.taskLabel}`);
      this.logger.info(`Doing Label: ${this.config.doingLabel}`);

      // Step 1: Check for issues with 'ai task' label
      const hasTaskIssues = await this.checkForTaskLabel();
      if (!hasTaskIssues) {
        return {
          success: true,
          message: "⏸️ Skipped - no issues with 'ai task' label found",
          timestamp,
        };
      }

      // Step 2: Get and filter eligible issues
      const selectedIssue = await this.findEligibleIssue();
      if (!selectedIssue) {
        return {
          success: true,
          message: "ℹ️ No eligible issues found (all have @claude in latest comment or ai doing label)",
          timestamp,
        };
      }

      // Step 3: Process the selected issue
      await this.processIssue(selectedIssue);

      return {
        success: true,
        processedIssue: {
          number: selectedIssue.number,
          title: selectedIssue.title,
        },
        message: `✅ Successfully processed issue #${selectedIssue.number}`,
        timestamp,
      };

    } catch (error) {
      this.logger.error(`Automation failed: ${error}`);
      return {
        success: false,
        message: `❌ Automation failed: ${error}`,
        timestamp,
      };
    }
  }

  /**
   * Check if there are any issues with the task label
   */
  private async checkForTaskLabel(): Promise<boolean> {
    this.logger.info(`Checking for existing '${this.config.taskLabel}' label...`);
    
    const taskIssues = await this.githubClient.getIssuesWithLabel(this.config.taskLabel);
    
    if (taskIssues.length > 0) {
      this.logger.success(`Found ${taskIssues.length} issues with '${this.config.taskLabel}' label. Proceeding with processing.`);
      return true;
    } else {
      this.logger.warn(`No '${this.config.taskLabel}' labels found. Skipping processing.`);
      return false;
    }
  }

  /**
   * Find an eligible issue for processing
   */
  private async findEligibleIssue(): Promise<IGitHubIssue | null> {
    this.logger.info(`Fetching issues with '${this.config.taskLabel}' label...`);
    
    const issues = await this.githubClient.getIssuesWithLabel(this.config.taskLabel);
    
    if (issues.length === 0) {
      this.logger.info(`No issues found with '${this.config.taskLabel}' label`);
      return null;
    }

    // Check each issue for eligibility
    for (const issue of issues) {
      this.logger.info(`Checking issue #${issue.number}: ${issue.title}`);
      
      // Check if issue already has 'ai doing' label (already being processed)
      const hasDoingLabel = issue.labels.some(label => label.name === this.config.doingLabel);
      if (hasDoingLabel) {
        this.logger.info(`⏭️ Skipping issue #${issue.number} (already has '${this.config.doingLabel}' label - in progress)`);
        continue;
      }
      
      const hasClaudeInLatestComment = await this.githubClient.hasClaudeInLatestComment(issue.number);
      
      if (hasClaudeInLatestComment) {
        this.logger.info(`⏭️ Skipping issue #${issue.number} (latest comment contains @claude)`);
        continue;
      } else {
        this.logger.success(`✅ Issue #${issue.number} is eligible (no @claude in latest comment and no '${this.config.doingLabel}' label)`);
        return issue;
      }
    }

    this.logger.info('ℹ️ No eligible issues found (all have @claude in latest comment or ai doing label)');
    return null;
  }

  /**
   * Process the selected issue by posting comment and adding label
   */
  private async processIssue(issue: IGitHubIssue): Promise<void> {
    this.logger.info(`📋 Processing issue #${issue.number}: ${issue.title}`);
    
    // Generate comment body
    const commentBody = this.config.commentTemplate.replace('{{issue_number}}', issue.number.toString());
    
    // Post comment to issue
    await this.githubClient.postComment(issue.number, commentBody);
    
    // Add 'ai doing' label
    await this.githubClient.addLabel(issue.number, this.config.doingLabel);
    
    this.logger.success(`🎉 Successfully processed issue #${issue.number}`);
  }

  /**
   * Generate summary report
   */
  generateSummary(result: IAutomationResult): string {
    const lines = [
      '## 🤖 Issue Automation Summary',
      '',
    ];

    if (!result.success) {
      lines.push(`- Status: ❌ **Failed**`);
      lines.push(`- Error: ${result.message}`);
    } else if (!result.processedIssue) {
      lines.push(`- Status: ${result.message.startsWith('⏸️') ? '⏸️ **Skipped**' : 'ℹ️ **No Action**'}`);
      lines.push(`- Action: ${result.message}`);
    } else {
      lines.push('- Status: ✅ **Processed**');
      lines.push(`- Issue: #${result.processedIssue.number}`);
      lines.push(`- Title: ${result.processedIssue.title}`);
      lines.push(`- Action: Posted automation comment and added '${this.config.doingLabel}' label`);
    }

    lines.push('');
    lines.push(`- Timestamp: ${result.timestamp}`);
    lines.push(`- Repository: ${this.config.owner}/${this.config.repo}`);
    lines.push('- Script: claude-code-automation');

    return lines.join('\n');
  }
}