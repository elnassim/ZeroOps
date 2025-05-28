import express, { Request, Response } from 'express';
import AWS from 'aws-sdk'; // AWS SDK main namespace
import { S3 } from "aws-sdk"; // Specifically S3 service interface
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file in the current directory (request-handler)
dotenv.config();

const app = express();
const PORT = process.env.REQUEST_HANDLER_PORT || 3001; // Default to 3001 if not in .env
const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

if (!S3_BUCKET_NAME) {
    console.error("AWS_S3_BUCKET_NAME is not defined in environment variables. This is required.");
    process.exit(1);
}
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION) {
    console.warn("WARN: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, or AWS_REGION might not be fully set via environment variables.");
    console.warn("Ensure these are set in your .env file or system environment for S3 client initialization.");
}

// Initialize S3 client directly with credentials from environment variables
const s3 = new S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!, // The '!' asserts that these will be present (checked by dotenv or system env)
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  region: process.env.AWS_REGION!,
  // signatureVersion: 'v4' // Consider adding if you encounter signature issues with some regions/bucket policies
});

function extractFromHost(hostname: string): string | null {
  if (!hostname) return null;
  // Handles <uuid>.yourdomain.com or <uuid>.ip.nip.io
  const parts = hostname.split('.');
  if (parts.length > 0) {
    // Basic check: UUIDs are typically 36 characters long
    // You might want a more robust regex if your deployment IDs have a different format
    if (parts[0].length === 36 || parts[0].match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) {
       return parts[0];
    }
  }
  return null;
}


app.get("/*", async (req: Request, res: Response) => {
  const host = req.hostname;
  let deploymentId = req.headers['x-deployment-id'] as string || null;
  let actualFilePath = req.path; // Path to be served from S3

  if (!deploymentId) {
    // Fallback or local testing logic
    if (host === "localhost" || host === "127.0.0.1") {
      const pathSegments = req.path.split('/').filter(segment => segment.length > 0);
      if (pathSegments.length > 0 && (pathSegments[0].length === 36 || pathSegments[0].match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/))) {
          deploymentId = pathSegments[0];
          actualFilePath = "/" + pathSegments.slice(1).join('/');
      } else {
          console.log(`[${host}] Could not determine deploymentId for local testing from path: ${req.path}`);
      }
    } else {
      // Fallback to extracting from hostname if header not present (e.g., direct access without Nginx or different proxy setup)
      deploymentId = extractFromHost(host);
      console.log(`[${host}] Extracted deploymentId from hostname as fallback: ${deploymentId}`);
    }
  } else {
    console.log(`[${host}] Using deploymentId from X-Deployment-Id header: ${deploymentId}`);
  }


  if (!deploymentId) {
    console.log(`[${host}] Could not extract deployment ID from header or hostname/path.`);
    return res.status(404).send("Site not found (could not determine deployment ID).");
  }

  let requestedS3Path = actualFilePath === "/" || actualFilePath === "" ? "/index.html" : actualFilePath;

  // Ensure the path starts with a slash if it's not empty
  if (requestedS3Path && !requestedS3Path.startsWith('/')) {
    requestedS3Path = '/' + requestedS3Path;
  }

  try {
    const s3Key = `dist/${deploymentId}${requestedS3Path}`;
    console.log(`[${host} -> ${deploymentId}] Attempting to serve: ${s3Key} from bucket ${S3_BUCKET_NAME}`);

    const file = await s3.getObject({
      Bucket: S3_BUCKET_NAME,
      Key: s3Key
    }).promise();

    const fileExtension = path.extname(s3Key).toLowerCase();
    let contentType = "application/octet-stream";

    if (fileExtension === ".html") contentType = "text/html";
    else if (fileExtension === ".css") contentType = "text/css";
    else if (fileExtension === ".js") contentType = "application/javascript";
    else if (fileExtension === ".png") contentType = "image/png";
    else if (fileExtension === ".jpg" || fileExtension === ".jpeg") contentType = "image/jpeg";
    else if (fileExtension === ".svg") contentType = "image/svg+xml";
    else if (fileExtension === ".json") contentType = "application/json";
    else if (fileExtension === ".txt") contentType = "text/plain";
    else if (fileExtension === ".ico") contentType = "image/x-icon";

    res.set("Content-Type", contentType);
    if (file.Body) {
        res.send(file.Body);
    } else {
        console.warn(`[${host} -> ${deploymentId}] S3 object Body was undefined for key: ${s3Key}`);
        res.status(404).send("File not found or empty.");
    }
  } catch (err: any) {
    console.error(`[${host} -> ${deploymentId}] Error fetching from S3 (${`dist/${deploymentId}${requestedS3Path}`}):`, err.code || err.message);

    if (err.code === 'NoSuchKey' || err.code === 'NotFound') {
        if (requestedS3Path !== '/index.html' && !path.extname(requestedS3Path)) {
            const spaIndexKey = `dist/${deploymentId}/index.html`;
            console.log(`[${host} -> ${deploymentId}] S3 Key not found. Attempting SPA fallback: ${spaIndexKey}`);
            try {
                const spaIndexObject = await s3.getObject({ Bucket: S3_BUCKET_NAME, Key: spaIndexKey }).promise();
                res.set('Content-Type', 'text/html');
                if (spaIndexObject.Body) {
                    return res.send(spaIndexObject.Body);
                }
            } catch (spaError: any) {
                console.error(`[${host} -> ${deploymentId}] SPA Fallback S3 Key not found: ${spaIndexKey}`, spaError.code || spaError.message);
            }
        }
        res.status(404).send("Not Found");
    } else {
        res.status(500).send("Error serving file.");
    }
  }
});

app.listen(PORT, () => {
  console.log(`Request Handler server running on http://localhost:${PORT}`);
  console.log(`Serving from S3 Bucket: ${S3_BUCKET_NAME}`);
});