// filepath: c:\Users\ASUS\Documents\S8\Java-avance\ZeroOps\deploy-service\src\config.ts
import dotenv from "dotenv";
import { S3 } from "aws-sdk"; // AWS SDK v2
import { createClient } from "redis";

dotenv.config(); // Load environment variables from .env file

// Redis Client Setup
// Note: Top-level await is only available if your tsconfig.json "module" is "esnext" or "system",
// or if you are in a .mts file. For "commonjs", you'll need to handle connection differently,
// typically by connecting inside an async function or using event listeners.
// For simplicity with commonjs, we'll export the client and connect where needed,
// or wrap the connection in an immediately invoked async function.

export const redisClient = createClient({
  // Default URL is redis://localhost:6379
  // You can specify url: process.env.REDIS_URL if needed
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

// It's better to connect to Redis when your application starts,
// for example, in your main application file (e.g., app.ts or index.ts).
// We will export the client and you can call redisClient.connect() there.
// Or, for an immediate connection attempt (ensure this file is imported early):
/*
(async () => {
  try {
    await redisClient.connect();
    console.log("Successfully connected to Redis!");
  } catch (err) {
    console.error("Could not connect to Redis:", err);
  }
})();
*/


// AWS S3 Client Setup (using AWS SDK v2 as per 'aws-sdk' import)
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION || !process.env.AWS_S3_BUCKET_NAME) {
  console.error("Missing AWS S3 configuration in .env file. Please ensure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_S3_BUCKET_NAME are set.");
  // process.exit(1); // Optionally exit if config is critical
}

export const s3 = new S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  region: process.env.AWS_REGION!, // e.g., "us-east-1"
  // endpoint: process.env.AWS_S3_ENDPOINT // Optional: e.g., for R2 or MinIO
});

export const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

// You might also want to export other configurations if needed
export const REDIS_BUILD_QUEUE_NAME = process.env.REDIS_BUILD_QUEUE_NAME || "deploy-queue";
export const REDIS_STATUS_HASH_NAME = process.env.REDIS_STATUS_HASH_NAME || "deployment-status";

export const BACKEND_API_BASE_URL = process.env.BACKEND_API_BASE_URL || 'http://localhost:8080';
export const DEPLOYMENT_BASE_URL_TEMPLATE = process.env.DEPLOYMENT_BASE_URL_TEMPLATE || 'http://%s.18.212.196.121.nip.io';

// --- Slack Notification Configuration ---
export const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || 'https://hooks.slack.com/services/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';

if (SLACK_WEBHOOK_URL === 'https://hooks.slack.com/services/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' || !SLACK_WEBHOOK_URL.startsWith('https://hooks.slack.com/')) {
    console.warn("SLACK_WEBHOOK_URL is not set correctly in .env. Slack notifications will be disabled or may fail.");
}