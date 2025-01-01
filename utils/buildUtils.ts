import { spawn } from "child_process";
import path from "path";
import { rm, unlink, mkdir } from "fs/promises";

export async function cleanupResources() {
    try {
        await rm(path.join("public", "srt"), { recursive: true, force: true });
        await rm(path.join("public", "voice"), {
            recursive: true,
            force: true,
        });
        await unlink(path.join("public", `audio.mp3`)).catch((e) =>
            console.error(e)
        );
        await unlink(path.join("src", "tmp", "context.tsx")).catch((e) =>
            console.error(e)
        );
        await mkdir(path.join("public", "srt"), { recursive: true });
        await mkdir(path.join("public", "voice"), { recursive: true });
    } catch (err) {
        console.error(`Error during cleanup: ${err}`);
    }
}

export async function runBuild(videoType: VideoType) {
    return new Promise((resolve, reject) => {
        console.log("Starting build process...");
        const buildProcess = spawn("npm", ["run", `build:${videoType}`], {
            stdio: ["pipe", "pipe", "pipe"],
            shell: true,
        });

        buildProcess.stdout.on("data", (data) => {
            process.stdout.write(`Build stdout: ${data}`);
        });

        buildProcess.stderr.on("data", (data) => {
            process.stderr.write(`Build stderr: ${data}`);
        });

        buildProcess.on("error", (error) => {
            console.error("Build process error:", error);
            reject(error);
        });

        buildProcess.on("close", (code) => {
            console.log(`Build process exited with code ${code}`);
            if (code === 0) {
                resolve(void 0);
            } else {
                reject(new Error(`Build process failed with code ${code}`));
            }
        });
    });
}
