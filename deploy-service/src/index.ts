import {
    redisClient,
    REDIS_BUILD_QUEUE_NAME,
    REDIS_STATUS_HASH_NAME,
    BACKEND_API_BASE_URL,
    DEPLOYMENT_BASE_URL_TEMPLATE,
    S3_BUCKET_NAME, // Using S3_BUCKET_NAME_OUTPUT for deployed artifacts
    // S3_BUCKET_NAME_SOURCES, // This would be used by downloadS3Folder if it needs a different source bucket
    // S3_REGION // AWS_REGION is used by S3 client, DEPLOYMENT_BASE_URL_TEMPLATE might use it
} from "./config";
import { downloadS3Folder, uploadFolderToS3 } from "./aws"; // Removed deleteS3Folder if not used
import { buildProject, copyFinalDist, cleanupOutputFolder } from "./utils";
import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import { NotificationManager } from './utils/NotificationManager';

const OUTPUT_BASE_DIR = path.join(__dirname, '..', 'output');

// Interface for fetching deployment details from the backend
interface DeploymentDetailsFromBackend {
    deploymentId: string;
    gitRepoUrl?: string; // Ensure your backend DTO provides this
    gitBranch?: string;  // Ensure your backend DTO provides this
    appName?: string;
    // Add other fields if your backend DTO provides them and they are useful
}

async function updateBackendStatus(
    deploymentId: string,
    status: string,
    url?: string,
    errorMsg?: string,
    duration?: number,
    // Parameters for Slack notifications
    repoUrl?: string,
    branch?: string
) {
  const backendApiUrl = `${BACKEND_API_BASE_URL}/api/deployments/${deploymentId}/status`;
  let successfulUpdate = false;
  try {
    console.log(`[${deploymentId}] Attempting to update backend status to ${status}. URL: ${url}, Error: ${errorMsg}, Duration: ${duration ? Math.round(duration / 1000) + 's' : 'N/A'}`);
    const response = await axios.put(backendApiUrl, {
      status: status,
      deploymentUrl: url,
      errorMessage: errorMsg,
      durationSeconds: duration ? Math.round(duration / 1000) : undefined
    });
    console.log(`[${deploymentId}] Successfully updated backend status to ${status}.`);
    if (response.status >= 200 && response.status < 300) {
        successfulUpdate = true;
    }
  } catch (error: any) {
    console.error(`[${deploymentId}] Failed to update backend status for ${deploymentId} to ${status}:`);
    if (error.response) {
      console.error('Error Response Data:', error.response.data);
      console.error('Error Response Status:', error.response.status);
      console.error('Error Response Headers:', error.response.headers);
    } else if (error.request) {
      console.error('Error Request Data:', error.request);
      console.error('No response received from the server.');
    } else {
      console.error('Error Message:', error.message);
    }
    console.error('Full Error Object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
  }

  // Send Slack notification if the backend update was attempted (or successful, depending on preference)
  // We'll send it even if backend update fails, to notify about the deployment's actual outcome.
  const notifier = NotificationManager.getInstance();
  const effectiveRepoUrl = repoUrl || "N/A"; // Use placeholders if not available
  const effectiveBranch = branch || "N/A";

  if (status.toUpperCase() === 'DEPLOYED' || status.toUpperCase() === 'SUCCESS') {
      await notifier.notifySuccess(deploymentId, effectiveRepoUrl, effectiveBranch, url);
  } else if (status.toUpperCase() === 'FAILED') {
      await notifier.notifyFailure(deploymentId, effectiveRepoUrl, effectiveBranch, errorMsg || "Unknown error");
  } else {
      // Optional: Send notifications for intermediate statuses if desired
      // await notifier.notifyStatusUpdate(deploymentId, effectiveRepoUrl, effectiveBranch, status, errorMsg);
  }
}

async function main() {
  try {
    await redisClient.connect();
    console.log("Successfully connected to Redis!");
  } catch (err) {
    console.error("Could not connect to Redis:", err);
    process.exit(1);
  }

  console.log(`Worker started. Waiting for jobs on queue: ${REDIS_BUILD_QUEUE_NAME}`);

  while (true) {
    let deploymentId: string | null = null;
    let fetchedRepoUrl: string | undefined;
    let fetchedBranch: string | undefined;
    // let fetchedAppName: string | undefined;

    try {
      console.log(`[WORKER] Attempting to pop from queue: ${REDIS_BUILD_QUEUE_NAME}... (blocking call)`);
      const response = await redisClient.brPop(REDIS_BUILD_QUEUE_NAME, 0); 

      if (response) {
        deploymentId = response.element; // Assuming the element is the deploymentId string
        console.log(`[WORKER - ${deploymentId}] Received job from queue '${response.key}'. Raw element: '${deploymentId}'. Starting processing...`);

        const startTime = Date.now();
        const projectPath = path.join(OUTPUT_BASE_DIR, deploymentId);

        // Fetch deployment details (repoUrl, branch) from backend API
        try {
            console.log(`[${deploymentId}] Fetching deployment details from backend: ${BACKEND_API_BASE_URL}/api/deployments/${deploymentId}`);
            const detailsResponse = await axios.get<DeploymentDetailsFromBackend>(`${BACKEND_API_BASE_URL}/api/deployments/${deploymentId}`);
            if (detailsResponse.data) {
                fetchedRepoUrl = detailsResponse.data.gitRepoUrl;
                fetchedBranch = detailsResponse.data.gitBranch;
                // fetchedAppName = detailsResponse.data.appName;
                console.log(`[${deploymentId}] Fetched details: repoUrl=${fetchedRepoUrl}, branch=${fetchedBranch}`);
                if (!fetchedRepoUrl || !fetchedBranch) {
                    console.warn(`[${deploymentId}] repoUrl or branch is missing from fetched details. Slack notifications might be less informative.`);
                }
            } else {
                console.warn(`[${deploymentId}] Could not fetch deployment details from backend or data is empty.`);
            }
        } catch (fetchError: any) {
            console.error(`[${deploymentId}] Error fetching deployment details: ${fetchError.message}. Slack notifications will be less informative.`);
            // Continue processing, but notifications will use placeholders for repo/branch
        }

        await fs.ensureDir(projectPath);
        console.log(`[${deploymentId}] Ensured output directory exists: ${projectPath}`);
        
        await redisClient.hSet(REDIS_STATUS_HASH_NAME, deploymentId, "PROCESSING_CLONE");

        try {
          await updateBackendStatus(deploymentId, "CLONING", undefined, undefined, Date.now() - startTime, fetchedRepoUrl, fetchedBranch);
          
          console.log(`[${deploymentId}] Downloading files from S3 sources/${deploymentId}/ to ${projectPath}...`);
          // downloadS3Folder needs to know the source bucket, ensure it's configured or passed if different from S3_BUCKET_NAME_OUTPUT
          await downloadS3Folder(deploymentId, projectPath); 
          console.log(`[${deploymentId}] Download complete.`);
          await updateBackendStatus(deploymentId, "CLONING_COMPLETE", undefined, undefined, Date.now() - startTime, fetchedRepoUrl, fetchedBranch);
          await redisClient.hSet(REDIS_STATUS_HASH_NAME, deploymentId, "CLONING_COMPLETE");

          const packageJsonPath = path.join(projectPath, 'package.json');
          const s3OutputPrefix = `dist/${deploymentId}`; // S3 prefix for the built application files in the output bucket

          if (fs.existsSync(packageJsonPath)) {
            console.log(`[${deploymentId}] package.json found. Proceeding with build process.`);
            await redisClient.hSet(REDIS_STATUS_HASH_NAME, deploymentId, "PROCESSING_BUILD");
            await updateBackendStatus(deploymentId, "BUILDING", undefined, undefined, Date.now() - startTime, fetchedRepoUrl, fetchedBranch);
            
            console.log(`[${deploymentId}] Building project in ${projectPath}...`);
            await buildProject(deploymentId, projectPath);
            console.log(`[${deploymentId}] Build complete.`);
            await updateBackendStatus(deploymentId, "BUILD_COMPLETE", undefined, undefined, Date.now() - startTime, fetchedRepoUrl, fetchedBranch);
            await redisClient.hSet(REDIS_STATUS_HASH_NAME, deploymentId, "BUILD_COMPLETE");

            const finalDistPath = await copyFinalDist(projectPath, deploymentId);
            
            console.log(`[${deploymentId}] Uploading final distribution from ${finalDistPath} to S3 output bucket prefix ${s3OutputPrefix}...`);
            await redisClient.hSet(REDIS_STATUS_HASH_NAME, deploymentId, "PROCESSING_UPLOAD_DIST");
            await updateBackendStatus(deploymentId, "UPLOADING", undefined, undefined, Date.now() - startTime, fetchedRepoUrl, fetchedBranch);
            await uploadFolderToS3(finalDistPath, s3OutputPrefix, deploymentId, ['.git']); // Uploads to S3_BUCKET_NAME_OUTPUT
            console.log(`[${deploymentId}] Build output upload complete.`);
            await updateBackendStatus(deploymentId, "UPLOAD_COMPLETE", undefined, undefined, Date.now() - startTime, fetchedRepoUrl, fetchedBranch);
            await redisClient.hSet(REDIS_STATUS_HASH_NAME, deploymentId, "UPLOAD_COMPLETE");

          } else {
            console.log(`[${deploymentId}] No package.json found. Assuming static site. Uploading contents of ${projectPath} to S3 output bucket prefix ${s3OutputPrefix}...`);
            await redisClient.hSet(REDIS_STATUS_HASH_NAME, deploymentId, "PROCESSING_UPLOAD_STATIC");
            await updateBackendStatus(deploymentId, "UPLOADING", undefined, undefined, Date.now() - startTime, fetchedRepoUrl, fetchedBranch);
            await uploadFolderToS3(projectPath, s3OutputPrefix, deploymentId, ['.git']); // Uploads to S3_BUCKET_NAME_OUTPUT
            console.log(`[${deploymentId}] Static site upload complete.`);
            await updateBackendStatus(deploymentId, "UPLOAD_COMPLETE", undefined, undefined, Date.now() - startTime, fetchedRepoUrl, fetchedBranch);
            await redisClient.hSet(REDIS_STATUS_HASH_NAME, deploymentId, "UPLOAD_COMPLETE");
          }

          const durationMs = Date.now() - startTime;
          // Construct the final URL using S3_BUCKET_NAME_OUTPUT from config
          const finalUrl = DEPLOYMENT_BASE_URL_TEMPLATE
            ? DEPLOYMENT_BASE_URL_TEMPLATE.replace('%s', deploymentId) // Assumes template uses deploymentId
            : `http://${S3_BUCKET_NAME}.s3-website-${process.env.AWS_REGION || 'your-aws-region'}.amazonaws.com/${s3OutputPrefix}/`;
            // Ensure AWS_REGION is available in .env or replace 'your-aws-region' if using the S3 website URL directly

          console.log(`[${deploymentId}] Deployment processed successfully. Final URL: ${finalUrl}. Duration: ${durationMs}ms`);
          await redisClient.hSet(REDIS_STATUS_HASH_NAME, deploymentId, "DEPLOYED");
          // This call will trigger the success notification
          await updateBackendStatus(deploymentId, "DEPLOYED", finalUrl, undefined, durationMs, fetchedRepoUrl, fetchedBranch);

        } catch (err: any) {
          const durationMs = Date.now() - startTime;
          console.error(`[${deploymentId}] Error processing deployment:`, err);
          const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during processing.";
          
          await redisClient.hSet(REDIS_STATUS_HASH_NAME, deploymentId, "FAILED");
          await redisClient.hSet(REDIS_STATUS_HASH_NAME, `${deploymentId}_error`, errorMessage);
          
          // This call will trigger the failure notification
          await updateBackendStatus(deploymentId, "FAILED", undefined, errorMessage, durationMs, fetchedRepoUrl, fetchedBranch);
        } finally {
            console.log(`[${deploymentId}] Cleaning up local output folder: ${projectPath}`);
            await cleanupOutputFolder(projectPath); 
            console.log(`[${deploymentId}] Local output folder cleanup complete.`);
        }
      } else {
        console.log("[WORKER] brPop returned null (e.g. timeout if not 0, or client disconnected). Will retry.");
      }
    } catch (queueError) {
      const idForLog = deploymentId || "N/A";
      console.error(`[WORKER - ${idForLog}] Error in main loop (e.g., popping from Redis queue or unhandled error in task processing):`, queueError);
      console.log("[WORKER] Waiting for 5 seconds before retrying pop...");
      await new Promise(resolve => setTimeout(resolve, 5000)); 
    }
  }
}

main().catch(err => {
  console.error("Unhandled error in main worker function, exiting:", err);
  if (redisClient && redisClient.isOpen) {
    redisClient.quit().catch(quitErr => console.error("Error quitting Redis client:", quitErr));
  }
  process.exit(1);
});