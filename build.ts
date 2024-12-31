import { spawn } from "child_process";
import path from "path";
import { rm, unlink, mkdir } from "fs/promises";
import transcribeFunction from "./transcribe";
import { storyComponents } from "./data/storyComponents";
import { transcript } from "./data/transcript";
import { story } from "./data/story";
import { season } from "./data/season";
import {
    bluepill,
    redpill,
    whitepill,
    blackpill,
    narrator,
} from "./data/agents";

const secrets: VideoSecrets = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
    CLAUDE_API_KEY: process.env.CLAUDE_API_KEY!,
    ELEVEN_API_KEY: process.env.ELEVEN_API_KEY!,
    NARRATOR_VOICE_ID: process.env.NARRATOR_VOICE_ID!,
    REDPILL_VOICE_ID: process.env.REDPILL_VOICE_ID!,
    WHITEPILL_VOICE_ID: process.env.WHITEPILL_VOICE_ID!,
    BLUEPILL_VOICE_ID: process.env.BLUEPILL_VOICE_ID!,
    BLACKPILL_VOICE_ID: process.env.BLACKPILL_VOICE_ID!,
    DEFAULT_VOICE_ID: process.env.DEFAULT_VOICE_ID!,
};

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

async function runBuild() {
    return new Promise((resolve, reject) => {
        console.log("Starting build process...");
        const buildProcess = spawn("npm", ["run", "build"], {
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

export async function generateVideoOnLatestStory(
    transcript: TranscriptWithAgent[],
    season: Season,
    story: Story,
    storyComponents: StoryComponentWithAgent[],
    secrets: VideoSecrets
) {
    await transcribeFunction(
        transcript,
        season,
        story,
        storyComponents,
        secrets
    );
    await runBuild();
    await cleanupResources();
}

(async () => {
    const transcriptWithAgent = transcript.map((t) => ({
        ...t,
        agent:
            t.agentId === "bluepill"
                ? bluepill
                : t.agentId === "redpill"
                ? redpill
                : t.agentId === "whitepill"
                ? whitepill
                : t.agentId === "blackpill"
                ? blackpill
                : t.agentId === "narrator"
                ? narrator
                : bluepill,
    }));
    const storyComponentsWithAgent = storyComponents.map((sc) => ({
        ...sc,
        characters: sc.characters
            .map((c) =>
                c === "bluepill"
                    ? bluepill
                    : c === "redpill"
                    ? redpill
                    : c === "whitepill"
                    ? whitepill
                    : c === "blackpill"
                    ? blackpill
                    : null
            )
            .filter((c): c is Agent => c !== null),
    }));
    await generateVideoOnLatestStory(
        transcriptWithAgent,
        season,
        story,
        storyComponentsWithAgent,
        secrets
    );
})();
