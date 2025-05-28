import { s3, S3_BUCKET_NAME } from "./config";
import fs from "fs-extra";
import path from "path";

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Downloads files from an S3 source prefix to a local destination path.
 * @param deploymentId The ID of the deployment, used to determine the S3 source prefix (`sources/${deploymentId}/`).
 * @param localDestPath The local path where files should be downloaded.
 */
export async function downloadS3Folder(deploymentId: string, localDestPath: string): Promise<void> {
  if (!S3_BUCKET_NAME) {
    console.error(`[${deploymentId}] S3_BUCKET_NAME is not defined. Skipping download.`);
    throw new Error("S3_BUCKET_NAME not configured.");
  }
  const s3SourcePrefix = `sources/${deploymentId}/`;
  console.log(`[${deploymentId}] Listing objects in S3 bucket '${S3_BUCKET_NAME}' with source prefix '${s3SourcePrefix}'`);

  const listParams = {
    Bucket: S3_BUCKET_NAME,
    Prefix: s3SourcePrefix,
  };

  const response = await s3.listObjectsV2(listParams).promise();
  const filesToDownload = response.Contents;

  if (!filesToDownload || filesToDownload.length === 0) {
    console.warn(`[${deploymentId}] No files found in S3 bucket '${S3_BUCKET_NAME}' for source prefix '${s3SourcePrefix}'.`);
    // It's possible a project has no source files if it's a simple static site uploaded directly.
    // However, if sources/${deploymentId}/ is expected to exist, this might indicate an issue upstream.
    // For now, we allow it to proceed, assuming an empty project is possible.
    return;
  }

  console.log(`[${deploymentId}] Found ${filesToDownload.length} file(s) to download from '${s3SourcePrefix}'.`);

  // Ensure the local destination directory exists
  await fs.ensureDir(localDestPath);
  console.log(`[${deploymentId}] Ensured local destination directory exists: ${localDestPath}`);

  await Promise.all(
    filesToDownload.map(async (file) => {
      if (!file.Key || file.Key.endsWith('/')) { // Skip if no key or if it's a "folder" object
          if(file.Key) console.log(`[${deploymentId}] Skipping S3 object (folder or no key): ${file.Key}`);
          return;
      }
      // Relative path from the s3SourcePrefix
      const relativePath = path.relative(s3SourcePrefix, file.Key);
      const localFilePath = path.join(localDestPath, relativePath);
      const localFileDir = path.dirname(localFilePath);

      await fs.ensureDir(localFileDir);

      console.log(`[${deploymentId}] Downloading S3 object: ${file.Key} to ${localFilePath}`);
      const s3Stream = s3.getObject({ Bucket: S3_BUCKET_NAME, Key: file.Key }).createReadStream();
      const fileStream = fs.createWriteStream(localFilePath);

      return new Promise<void>((resolve, reject) => {
        s3Stream.pipe(fileStream)
          .on('error', (err) => {
            console.error(`[${deploymentId}] Error writing file ${localFilePath} from S3 stream:`, err);
            reject(err);
          })
          .on('finish', () => {
            // console.log(`[${deploymentId}] Successfully downloaded ${file.Key} to ${localFilePath}`); // Verbose
            resolve();
          });
        s3Stream.on('error', (err) => {
            console.error(`[${deploymentId}] Error streaming from S3 for key ${file.Key}:`, err);
            reject(err);
        });
      });
    })
  );
  console.log(`[${deploymentId}] All files downloaded successfully from '${s3SourcePrefix}' to '${localDestPath}'.`);
}


// Helper function to get all file paths in a directory recursively, with exclusions
function getAllFiles(
  dirPath: string,
  arrayOfFiles: string[] = [],
  baseDir: string = dirPath,
  exclusions: string[] = []
): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    const relativePathForExclusion = path.relative(baseDir, fullPath).replace(/\\/g, '/'); // Normalize for exclusion matching

    // Check if the current file/directory (relative to baseDir) should be excluded
    if (exclusions.some(exclusion => relativePathForExclusion === exclusion || relativePathForExclusion.startsWith(exclusion + '/'))) {
      // console.log(`[getAllFiles] Excluding: ${fullPath} (matches exclusion based on ${relativePathForExclusion})`); // Verbose
      return;
    }

    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles, baseDir, exclusions);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });
  return arrayOfFiles;
}

/**
 * Uploads a local folder to a specified S3 prefix, with exclusions.
 * @param localFolderPath The path to the local folder to upload.
 * @param s3Prefix The prefix (folder path) in S3 where files will be uploaded.
 * @param deploymentId The ID of the deployment (for logging).
 * @param exclusions An array of relative paths/folder names to exclude from the root of localFolderPath (e.g., ['.git', 'node_modules']).
 */
export async function uploadFolderToS3(
  localFolderPath: string,
  s3Prefix: string,
  deploymentId: string,
  exclusions: string[] = []
): Promise<void> {
  if (!S3_BUCKET_NAME) {
    console.error(`[${deploymentId}] S3_BUCKET_NAME is not defined. Skipping upload.`);
    throw new Error("S3_BUCKET_NAME not configured.");
  }
  if (!await fs.pathExists(localFolderPath)) {
    console.warn(`[${deploymentId}] Local folder path does not exist: ${localFolderPath}. Nothing to upload.`);
    throw new Error(`[${deploymentId}] Local folder path for upload does not exist: ${localFolderPath}`);
  }

  console.log(`[${deploymentId}] Scanning folder ${localFolderPath} for files to upload to S3 prefix '${s3Prefix}', excluding: ${exclusions.join(', ')}...`);
  const allFilePaths = getAllFiles(localFolderPath, [], localFolderPath, exclusions);

  if (allFilePaths.length === 0) {
    console.log(`[${deploymentId}] No files found in '${localFolderPath}' (after exclusions) to upload.`);
    return;
  }

  console.log(`[${deploymentId}] Found ${allFilePaths.length} file(s) to upload from '${localFolderPath}' to S3 prefix '${s3Prefix}'.`);

  await Promise.all(
    allFilePaths.map(async (filePath) => {
      const relativePath = path.relative(localFolderPath, filePath);
      const s3Key = path.join(s3Prefix, relativePath).replace(/\\/g, "/"); // Ensure S3 keys use forward slashes

      // console.log(`[${deploymentId}] Uploading ${filePath} to s3://${S3_BUCKET_NAME}/${s3Key}`); // Verbose

      const fileContent = await fs.readFile(filePath);

      try {
        await s3.putObject({
          Bucket: S3_BUCKET_NAME,
          Key: s3Key,
          Body: fileContent,
          // ACL: 'public-read', // Uncomment if you want files to be publicly readable by default
        }).promise();
        // console.log(`[${deploymentId}] Successfully uploaded ${s3Key}`); // Verbose
      } catch (error) {
        console.error(`[${deploymentId}] Failed to upload ${filePath} to ${s3Key}:`, error);
        throw error; // Re-throw to fail the deployment
      }
    })
  );
  console.log(`[${deploymentId}] All ${allFilePaths.length} files from '${localFolderPath}' uploaded successfully to S3 prefix '${s3Prefix}'.`);
}

/**
 * Deletes a folder (all objects with a given prefix) from S3.
 * @param s3Prefix The S3 prefix (folder) to delete.
 * @param deploymentId The ID of the deployment (for logging).
 */
export async function deleteS3Folder(s3Prefix: string, deploymentId: string): Promise<void> {
  if (!S3_BUCKET_NAME) {
    console.error(`[${deploymentId}] S3_BUCKET_NAME is not defined. Skipping S3 folder deletion.`);
    return; // Or throw error if this is critical
  }
  console.log(`[${deploymentId}] Starting deletion of S3 folder (prefix) '${s3Prefix}' from bucket '${S3_BUCKET_NAME}'`);

  try {
    const listedObjects = await s3.listObjectsV2({ Bucket: S3_BUCKET_NAME, Prefix: s3Prefix }).promise();

    if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
      console.log(`[${deploymentId}] No objects found to delete at prefix '${s3Prefix}'.`);
      return;
    }

    const deleteParams: AWS.S3.DeleteObjectsRequest = {
      Bucket: S3_BUCKET_NAME,
      Delete: { Objects: [] }
    };

    listedObjects.Contents.forEach(({ Key }) => {
      if (Key) {
        deleteParams.Delete.Objects.push({ Key });
      }
    });

    if (deleteParams.Delete.Objects.length > 0) {
      await s3.deleteObjects(deleteParams).promise();
      console.log(`[${deploymentId}] Successfully deleted ${deleteParams.Delete.Objects.length} objects under prefix '${s3Prefix}'.`);
    } else {
      console.log(`[${deploymentId}] No objects to delete after filtering.`);
    }
  } catch (error) {
    console.error(`[${deploymentId}] Error deleting S3 folder (prefix: ${s3Prefix}):`, error);
    // Do not re-throw, as cleanup failure shouldn't necessarily fail the whole deployment process if it's at the end.
  }
}