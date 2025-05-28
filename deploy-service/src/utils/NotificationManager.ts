import { IncomingWebhook, IncomingWebhookSendArguments } from '@slack/webhook';
import { SLACK_WEBHOOK_URL } from '../config';
import pino, { Logger } from 'pino'; // Import pino and Logger type
import { appendFileSync } from 'fs'; // Import appendFileSync from Node.js fs module
import path from 'path'; // Import path for constructing log file path

export class NotificationManager {
  private static instance: NotificationManager;
  private slackClient: IncomingWebhook | null = null;
  private isEnabled: boolean = false;

  // Create a logger instance
  private logger: Logger;
  private logFile: string;

  private constructor() {
    // Initialize logger
    // For pino-pretty to work when running directly with ts-node or similar,
    // you might need to pipe output: `ts-node your-script.ts | pino-pretty`
    // Or configure transport programmatically for development.
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info', // Default to 'info', can be configured
      // transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined, // Prettier logs in dev
    });

    // Define log file path (e.g., in the root of deploy-service)
    this.logFile = path.join(__dirname, '..', '..', 'notifications.log'); // Puts it in deploy-service/notifications.log

    this.logger.info('NotificationManager: Initializing...');

    if (SLACK_WEBHOOK_URL && SLACK_WEBHOOK_URL !== 'YOUR_SLACK_WEBHOOK_URL_HERE' && SLACK_WEBHOOK_URL.startsWith('https://hooks.slack.com/')) {
      this.slackClient = new IncomingWebhook(SLACK_WEBHOOK_URL);
      this.isEnabled = true;
      this.logger.info('NotificationManager: Slack notifications enabled.');
      console.log('NotificationManager: Slack notifications enabled.'); // Keep original console log if desired
    } else {
      this.logger.warn('NotificationManager: SLACK_WEBHOOK_URL is not configured or is invalid. Slack notifications are disabled.');
      console.warn('NotificationManager: SLACK_WEBHOOK_URL is not configured or is invalid. Slack notifications are disabled.'); // Keep original console log
      this.isEnabled = false;
    }
    this.logger.info(`NotificationManager: Log file path: ${this.logFile}`);
  }

  public static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  private writeToLogFile(message: string) {
    try {
      appendFileSync(this.logFile, `${new Date().toISOString()} ${message}\n`);
    } catch (error) {
      this.logger.error({ err: error }, 'NotificationManager: Failed to write to log file.');
      console.error('NotificationManager: Failed to write to log file:', error); // Fallback console log
    }
  }

  private async sendNotification(payload: IncomingWebhookSendArguments) {
    if (!this.isEnabled || !this.slackClient) {
      const skipMessage = `Skipping Slack notification (disabled or client not initialized): ${payload.text}`;
      this.logger.info(skipMessage);
      this.writeToLogFile(`[INFO] ${skipMessage}`);
      return;
    }
    try {
      await this.slackClient.send(payload);
      const successMessage = `Slack notification sent successfully: ${payload.text}`;
      this.logger.info(successMessage);
      this.writeToLogFile(`[INFO] ${successMessage}`);
    } catch (error) {
      const errorMessage = `Error sending Slack notification: ${payload.text}`;
      this.logger.error({ err: error, notificationPayload: payload }, errorMessage);
      this.writeToLogFile(`[ERROR] ${errorMessage} - Details: ${error instanceof Error ? error.message : String(error)}`);
      console.error('NotificationManager: Error sending Slack notification:', error); // Fallback console log
    }
  }

  public async notifySuccess(deploymentId: string, repoUrl: string, branch: string, deploymentUrl?: string) {
    const text = `:white_check_mark: Deployment *${deploymentId}* of \`${repoUrl}\` (branch \`${branch}\`) *succeeded!* ${deploymentUrl ? `\nDeployed at: <${deploymentUrl}|${deploymentUrl}>` : ''}`;
    
    this.logger.info({ deploymentId, repoUrl, branch, deploymentUrl, status: 'SUCCESS' }, `Deployment Succeeded: ${text}`);
    this.writeToLogFile(`[SUCCESS] ${text}`);

    const payload: IncomingWebhookSendArguments = {
      text: text,
      attachments: [
        {
          color: "#36a64f",
          fields: [
            { title: "Deployment ID", value: deploymentId, short: true },
            { title: "Repository", value: repoUrl, short: true },
            { title: "Branch", value: branch, short: true },
            ...(deploymentUrl ? [{ title: "Live URL", value: `<${deploymentUrl}|Visit Site>`, short: false }] : [])
          ]
        }
      ]
    };
    await this.sendNotification(payload);
  }

  public async notifyFailure(deploymentId: string, repoUrl: string, branch: string, errorMessage: string) {
    const text = `:x: Deployment *${deploymentId}* of \`${repoUrl}\` (branch \`${branch}\`) *failed.*`;
    const fullErrorMessage = `${text} Error: ${errorMessage}`;

    this.logger.error({ deploymentId, repoUrl, branch, status: 'FAILED', error: errorMessage }, `Deployment Failed: ${fullErrorMessage}`);
    this.writeToLogFile(`[FAILURE] ${fullErrorMessage}`);
    
    const payload: IncomingWebhookSendArguments = {
      text: text, // Main text for Slack
      attachments: [
        {
          color: "#ff0000",
          fields: [
            { title: "Deployment ID", value: deploymentId, short: true },
            { title: "Repository", value: repoUrl, short: true },
            { title: "Branch", value: branch, short: true },
            { title: "Error", value: `\`\`\`${errorMessage}\`\`\``, short: false }
          ]
        }
      ]
    };
    await this.sendNotification(payload);
  }

  public async notifyStatusUpdate(deploymentId: string, repoUrl: string, branch: string, status: string, details?: string) {
    const emojiMap: { [key: string]: string } = {
      PENDING: ':hourglass_flowing_sand:',
      QUEUED: ':inbox_tray:',
      CLONING: ':arrow_down:',
      CLONING_COMPLETE: ':heavy_check_mark: :arrow_down:',
      BUILDING: ':hammer_and_wrench:',
      BUILD_COMPLETE: ':heavy_check_mark: :hammer_and_wrench:',
      UPLOADING: ':arrow_up:',
      UPLOAD_COMPLETE: ':heavy_check_mark: :arrow_up:',
      DEPLOYED: ':rocket:',
    };
    const emoji = emojiMap[status.toUpperCase()] || ':information_source:';
    const text = `${emoji} Deployment *${deploymentId}* (\`${repoUrl}\` - \`${branch}\`) status: *${status}*. ${details || ''}`;

    this.logger.info({ deploymentId, repoUrl, branch, status, details }, `Deployment Status Update: ${text}`);
    this.writeToLogFile(`[STATUS_UPDATE] ${text}`);
    
    if (status.toUpperCase() === 'SUCCESS' || status.toUpperCase() === 'FAILED') {
        this.logger.info(`notifyStatusUpdate: Skipping Slack for ${status} as it has dedicated methods.`);
        return; // SUCCESS and FAILED have dedicated methods that handle Slack
    }

    const payload: IncomingWebhookSendArguments = {
      text: text,
       attachments: [
        {
          color: "#439FE0",
          fields: [
            { title: "Deployment ID", value: deploymentId, short: true },
            { title: "Status", value: status, short: true },
            ...(details ? [{ title: "Details", value: details, short: false }] : [])
          ]
        }
      ]
    };
    await this.sendNotification(payload);
  }
}