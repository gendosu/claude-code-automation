import { Octokit } from '@octokit/rest';
import { IGitHubIssue, IGitHubComment, IAutomationConfig, ILogger } from './types.js';

/**
 * GitHub API client wrapper for issue automation
 */
export class GitHubClient {
  private octokit: Octokit;
  private config: IAutomationConfig;
  private logger: ILogger;

  constructor(config: IAutomationConfig, logger: ILogger) {
    this.config = config;
    this.logger = logger;
    this.octokit = new Octokit({
      auth: config.token,
    });
  }

  /**
   * Get issues with specific label
   */
  async getIssuesWithLabel(label: string, state: 'open' | 'closed' | 'all' = 'open'): Promise<IGitHubIssue[]> {
    try {
      this.logger.info(`Fetching issues with label: ${label}`);
      
      const response = await this.octokit.rest.issues.listForRepo({
        owner: this.config.owner,
        repo: this.config.repo,
        labels: label,
        state,
        sort: 'created',
        direction: 'desc',
        per_page: this.config.maxIssuesPerRun,
      });

      this.logger.info(`Found ${response.data.length} issues with '${label}' label`);
      return response.data as IGitHubIssue[];
    } catch (error) {
      this.logger.error(`Failed to fetch issues: ${error}`);
      throw error;
    }
  }

  /**
   * Get comments for a specific issue
   */
  async getIssueComments(issueNumber: number): Promise<IGitHubComment[]> {
    try {
      const response = await this.octokit.rest.issues.listComments({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issueNumber,
        sort: 'created',
        direction: 'desc',
        per_page: 1,
      });

      return response.data as IGitHubComment[];
    } catch (error) {
      this.logger.error(`Failed to fetch comments for issue #${issueNumber}: ${error}`);
      throw error;
    }
  }

  /**
   * Check if the latest comment contains @claude mention
   */
  async hasClaudeInLatestComment(issueNumber: number): Promise<boolean> {
    try {
      const comments = await this.getIssueComments(issueNumber);
      
      if (comments.length === 0) {
        this.logger.info(`Issue #${issueNumber} has no comments`);
        return false;
      }

      const latestComment = comments[0];
      const hasClaudeMention = latestComment.body.includes('@claude');
      
      if (hasClaudeMention) {
        this.logger.info(`Issue #${issueNumber} has @claude in latest comment`);
      } else {
        this.logger.info(`Issue #${issueNumber} does not have @claude in latest comment`);
      }

      return hasClaudeMention;
    } catch (error) {
      this.logger.error(`Failed to check latest comment for issue #${issueNumber}: ${error}`);
      return true; // Assume has @claude to avoid processing on error
    }
  }

  /**
   * Post a comment to an issue
   */
  async postComment(issueNumber: number, body: string): Promise<void> {
    try {
      this.logger.info(`Posting comment to issue #${issueNumber}`);
      
      await this.octokit.rest.issues.createComment({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issueNumber,
        body,
      });

      this.logger.success(`Successfully posted comment to issue #${issueNumber}`);
      this.logger.info(`Comment: ${body}`);
    } catch (error) {
      this.logger.error(`Failed to post comment to issue #${issueNumber}: ${error}`);
      throw error;
    }
  }

  /**
   * Add a label to an issue
   */
  async addLabel(issueNumber: number, label: string): Promise<void> {
    try {
      this.logger.info(`Adding '${label}' label to issue #${issueNumber}`);
      
      await this.octokit.rest.issues.addLabels({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issueNumber,
        labels: [label],
      });

      this.logger.success(`Successfully added '${label}' label to issue #${issueNumber}`);
    } catch (error) {
      this.logger.error(`Failed to add label to issue #${issueNumber}: ${error}`);
      throw error;
    }
  }

  /**
   * Remove a label from an issue
   */
  async removeLabel(issueNumber: number, label: string): Promise<void> {
    try {
      this.logger.info(`Removing '${label}' label from issue #${issueNumber}`);
      
      await this.octokit.rest.issues.removeLabel({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issueNumber,
        name: label,
      });

      this.logger.success(`Successfully removed '${label}' label from issue #${issueNumber}`);
    } catch (error) {
      this.logger.error(`Failed to remove label from issue #${issueNumber}: ${error}`);
      throw error;
    }
  }
}