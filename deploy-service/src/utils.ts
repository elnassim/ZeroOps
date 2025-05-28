import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';

/**
 * Executes a shell command.
 * @param command The command to execute.
 * @param cwd The working directory for the command.
 * @param deploymentId For logging.
 */
function executeCommand(command: string, cwd: string, deploymentId: string): Promise<string> {
  console.log(`[${deploymentId}] Executing command: ${command} in ${cwd}`);
  return new Promise((resolve, reject) => {
    const process = exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[${deploymentId}] Error executing command: ${command}\n${stderr}`);
        reject(error);
        return;
      }
      // console.log(`[${deploymentId}] Command output for ${command}:\n${stdout}`); // Verbose
      if (stderr) {
        console.warn(`[${deploymentId}] Command stderr for ${command}:\n${stderr}`);
      }
      resolve(stdout);
    });

    process.stdout?.on('data', (data) => console.log(`[${deploymentId}][stdout] ${data.toString().trim()}`));
    process.stderr?.on('data', (data) => console.warn(`[${deploymentId}][stderr] ${data.toString().trim()}`));
  });
}

/**
 * Builds the project located at projectPath.
 * Assumes npm is used.
 * @param deploymentId For logging.
 * @param projectPath Path to the project.
 */
export async function buildProject(deploymentId: string, projectPath: string): Promise<void> {
  console.log(`[${deploymentId}] Starting build process in ${projectPath}`);
  // Install dependencies
  await executeCommand('npm install', projectPath, deploymentId);
  console.log(`[${deploymentId}] Dependencies installed.`);
  // Run build script
  await executeCommand('npm run build', projectPath, deploymentId);
  console.log(`[${deploymentId}] Project build completed.`);
}

/**
 * Copies the final distribution to a standardized location or identifies it.
 * This is a placeholder and might need adjustment based on your build output.
 * For many frameworks, 'dist' is standard. If not, this function needs to find it.
 * @param projectPath Path to the project.
 * @param deploymentId For logging.
 * @returns Path to the final distribution folder.
 */
export async function copyFinalDist(projectPath: string, deploymentId: string): Promise<string> {
  const commonDistFolders = ['dist', 'build', 'public', '_site']; // Add other common build output folders
  let distPath: string | null = null;

  for (const folder of commonDistFolders) {
    const potentialPath = path.join(projectPath, folder);
    if (await fs.pathExists(potentialPath) && (await fs.readdir(potentialPath)).length > 0) {
      distPath = potentialPath;
      break;
    }
  }

  if (!distPath) {
    // If no common dist folder is found, assume the projectPath itself is the dist (e.g. simple static site)
    // Or, if a specific file like index.html exists at the root, that's a good sign.
    if (await fs.pathExists(path.join(projectPath, 'index.html'))) {
        console.log(`[${deploymentId}] No standard 'dist' folder found, but index.html exists at root. Using project root as dist: ${projectPath}`);
        distPath = projectPath;
    } else {
        console.error(`[${deploymentId}] Could not determine distribution folder in ${projectPath}. Looked for: ${commonDistFolders.join(', ')} or root with index.html.`);
        throw new Error(`[${deploymentId}] Distribution folder not found in ${projectPath}.`);
    }
  }
  
  console.log(`[${deploymentId}] Identified final distribution folder: ${distPath}`);
  return distPath;
}

/**
 * Cleans up (deletes) the local output folder for a deployment.
 * @param folderPath Path to the folder to delete.
 */
export async function cleanupOutputFolder(folderPath: string): Promise<void> {
  console.log(`[Cleanup] Attempting to delete directory: ${folderPath}`);
  try {
    await fs.remove(folderPath); // fs-extra.remove handles non-empty directories
    console.log(`[Cleanup] Successfully deleted directory: ${folderPath}`);
  } catch (error: any) {
    console.error(`[Cleanup] Failed to delete directory ${folderPath}: ${error.message}`);
    // Depending on requirements, you might want to retry or just log the error.
    // For now, just log and continue.
  }
}