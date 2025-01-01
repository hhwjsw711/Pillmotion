import { parseArgs } from "node:util";
import { generateTranscriptAudio } from "./audioGenerator";
import {
    generateStoryContextContent,
    generateMemeContextContent,
} from "./contextGenerators";
import { writeFile } from "fs/promises";
import transcribe from "./transcribe";
import { storyComponents } from "./data/storyComponents";
import { storyTranscript } from "./data/storyTranscript";
import { story } from "./data/story";
import { season } from "./data/season";
import generateMemeCoinTranscript from "./transcript";
import { cleanupResources, runBuild } from "./utils/buildUtils";

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
    SOCIAL_DATA_API_KEY: process.env.SOCIAL_DATA_API_KEY!,
};

const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
        type: {
            type: "string",
            short: "t",
            default: "story",
        },
        ticker: {
            type: "string",
            short: "s",
            default: "PILLZUMI",
        },
    },
});

async function main() {
    const videoType = values.type as VideoType;
    let transcript: Transcript[] = [];
    let contextContent: string = "";

    switch (videoType) {
        case "story": {
            console.log("📝 Generating story transcript... ");
            transcript = storyTranscript;
            const { audios } = await generateTranscriptAudio(
                transcript,
                secrets
            );
            contextContent = generateStoryContextContent(
                audios,
                storyTranscript,
                season,
                story,
                storyComponents
            );
            break;
        }
        case "meme": {
            console.log("🎭 Generating meme transcript...");
            const agentA = "redpill";
            const agentB = "bluepill";
            const ticker = values.ticker;
            const duration = 1;

            const memeTranscript = await generateMemeCoinTranscript(
                agentA,
                agentB,
                ticker,
                duration,
                secrets
            );

            transcript = memeTranscript.transcript;
            const { audios } = await generateTranscriptAudio(
                transcript,
                secrets
            );

            contextContent = generateMemeContextContent(
                audios,
                agentA,
                agentB,
                duration,
                60,
                "wii",
                ticker,
                memeTranscript.tradingViewSymbol,
                memeTranscript.currentPrice,
                memeTranscript.marketCap,
                memeTranscript.percentageChange
            );
            break;
        }
        default:
            throw new Error(`Unknown video type: ${videoType}`);
    }

    await writeFile("./src/tmp/context.tsx", contextContent, "utf-8");
    await transcribe(transcript, secrets);
    await runBuild(videoType);
    await cleanupResources();
}

main();
