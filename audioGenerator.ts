import fetch from "node-fetch";
import fs from "fs";
import { writeFile } from "fs/promises";

// Add logging at import time
console.log("🔄 Initializing eleven.mjs module");

// First, let's add the emoji array and function at the top level
const storyEmojis = [
    "🌟",
    "💫",
    "✨",
    "🔥",
    "⚡️",
    "💥",
    "🌪️",
    "🎭",
    "🎪",
    "🎬",
    "🎯",
    "🎲",
    "🎨",
    "🌈",
    "💎",
    "🔮",
    "⚔️",
    "🛡️",
    "🏆",
    "👑",
];

const getRandomEmoji = () =>
    storyEmojis[Math.floor(Math.random() * storyEmojis.length)];

export async function generateTranscriptAudio(
    transcript: TranscriptWithAgent[],
    season: Season,
    story: Story,
    storyComponents: StoryComponentWithAgent[],
    secrets: VideoSecrets
) {
    console.log("⭐ Starting generateTranscriptAudio");
    console.log("📝 Transcript length:", transcript.length);

    try {
        console.log("📜 Getting transcript from transcriptFunction");
        console.log("✅ Transcript generated:", transcript.length, "entries");

        const audios = [];

        for (let i = 0; i < transcript.length; i++) {
            const person = transcript[i].agent;
            const line = transcript[i].text;
            let personName = person.name;

            console.log(
                `🎭 Processing entry ${i + 1}/${
                    transcript.length
                }: ${personName}`
            );

            if (
                personName !== "narrator" &&
                personName !== "redpill" &&
                personName !== "whitepill" &&
                personName !== "bluepill" &&
                personName !== "blackpill"
            ) {
                console.log(
                    `⚠️ Unknown character type: ${personName}, setting to unknown`
                );
                personName = "unknown";
            }

            const voice_id =
                personName === "whitepill"
                    ? secrets.WHITEPILL_VOICE_ID
                    : personName === "redpill"
                    ? secrets.REDPILL_VOICE_ID
                    : personName === "blackpill"
                    ? secrets.BLACKPILL_VOICE_ID
                    : personName === "narrator"
                    ? secrets.NARRATOR_VOICE_ID
                    : personName === "bluepill"
                    ? secrets.BLUEPILL_VOICE_ID
                    : secrets.DEFAULT_VOICE_ID;

            console.log(
                `🎤 Selected voice_id for ${personName}:`,
                voice_id ? "✅" : "❌"
            );

            try {
                console.log(
                    `🔊 Generating audio for entry ${i + 1}: "${line.substring(
                        0,
                        50
                    )}..."`
                );
                await generateAudio(
                    voice_id ?? "",
                    personName,
                    line,
                    i,
                    secrets
                );
                console.log(
                    `✅ Audio generated successfully for entry ${i + 1}`
                );

                audios.push({
                    person: personName,
                    audio: `public/voice/${personName}-${i}.mp3`,
                    index: i,
                });
            } catch (error) {
                console.error(
                    `❌ Error generating audio for entry ${i + 1}:`,
                    error
                );
                throw error;
            }
        }

        console.log("📝 Generated audios array:", audios.length, "entries");
        console.log("📄 Creating context file...");

        const contextContent = `
import { staticFile } from 'remotion';

export const music: string = 'NONE';
export const fps = 60;

export const seasonNumber = 1; 
export const seasonName = '${season.title}';
export const episodeNumber = ${story.episode_number};
export const storyName = '${story.title}';

export const segmentBoundaries = {
	${generateSegmentBoundaries(transcript, storyComponents)}
};

export const subtitlesFileName = [
	${audios
        .map(
            (entry, i) => `{
		name: '${entry.person}',
		file: staticFile('srt/${entry.person}-${i}.srt'),
	}`
        )
        .join(",\n    ")}
];`;

        await writeFile("./src/tmp/context.tsx", contextContent, "utf-8");
        console.log("✅ Context file created successfully");

        return { audios, transcript };
    } catch (error) {
        console.error("❌ Error in generateTranscriptAudio:", error);
        console.error("🔍 Error details:", {
            name: (error as Error).name,
            message: (error as Error).message,
            stack: (error as Error).stack,
        });
        throw error;
    }
}

// Then modify the generateSegmentBoundaries function
function generateSegmentBoundaries(
    transcript: TranscriptWithAgent[],
    storyComponents: StoryComponentWithAgent[]
): string {
    const segments: string[] = [];
    let currentComponentOrder = transcript[0]?.componentOrder;
    let startIndex = 0;

    for (let i = 0; i < transcript.length; i++) {
        const entry = transcript[i];

        if (entry.componentOrder !== currentComponentOrder) {
            const component = storyComponents.find(
                (c) => c.order === currentComponentOrder
            );
            segments.push(`${startIndex}: {
		title: "${getRandomEmoji()} ${component?.title || ""}",
		location: \`${component?.location?.name || "Unknown Location"}\`,
		description: \`${component?.description || ""}\`,
		endIndex: ${i - 1},
	}`);

            currentComponentOrder = entry.componentOrder;
            startIndex = i;
        }
    }

    // Last segment
    if (startIndex < transcript.length) {
        const component = storyComponents.find(
            (c) => c.order === currentComponentOrder
        );
        segments.push(`${startIndex}: {
		title: "${getRandomEmoji()} ${component?.title || "Unknown Scene"}",
		location: \`${component?.location?.name || "Unknown Location"}\`,
		description: \`${component?.description || ""}\`,
		endIndex: ${transcript.length - 1},
	}`);
    }

    return segments.join(",\n    ");
}

export async function generateAudio(
    voice_id: string,
    person: string,
    line: string,
    index: number,
    secrets: VideoSecrets
) {
    console.log("📂 Current working directory:", process.cwd());
    console.log(
        "📂 Attempting to write to:",
        `${process.cwd()}/public/voice/${person}-${index}.mp3`
    );

    try {
        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}?enable_logging=true&output_format=mp3_44100_64`,
            {
                method: "POST",
                headers: {
                    "xi-api-key": secrets.ELEVEN_API_KEY ?? "",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model_id: "eleven_multilingual_v2",
                    text: line,
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("🚨 ElevenLabs API Error Details:", {
                status: response.status,
                statusText: response.statusText,
                errorBody: errorText,
                voiceId: voice_id,
                textLength: line.length,
                person: person,
            });
            throw new Error(
                `Server responded with status code ${response.status}: ${errorText}`
            );
        }

        // Create directories if they don't exist
        const dirPath = `${process.cwd()}/public/voice`;
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        const audioStream = fs.createWriteStream(
            `${process.cwd()}/public/voice/${person}-${index}.mp3`
        );
        response.body.pipe(audioStream);

        return new Promise((resolve, reject) => {
            audioStream.on("finish", () => {
                resolve("Audio file saved successfully");
            });
            audioStream.on("error", reject);
        });
    } catch (error) {
        console.error("❌ Detailed error in generateAudio:", {
            person,
            voiceId: voice_id,
            textLength: line.length,
            textPreview: line.substring(0, 100),
            error: (error as Error).message,
        });
        throw error;
    }
}
