import fetch from "node-fetch";
import fs from "fs";

export async function generateTranscriptAudio(
    transcript: MemeCoinTranscript[],
    secrets: VideoSecrets
) {
    console.log("⭐ Starting generateTranscriptAudio");
    console.log("📝 Transcript length:", transcript.length);

    try {
        console.log("📜 Getting transcript from transcriptFunction");
        console.log("✅ Transcript generated:", transcript.length, "entries");

        const audios = [];

        for (let i = 0; i < transcript.length; i++) {
            let agentId = transcript[i].agentId;
            const text = transcript[i].text;

            console.log(
                `🎭 Processing entry ${i + 1}/${transcript.length}: ${agentId}`
            );

            if (
                agentId !== "narrator" &&
                agentId !== "redpill" &&
                agentId !== "whitepill" &&
                agentId !== "bluepill" &&
                agentId !== "blackpill"
            ) {
                console.log(
                    `⚠️ Unknown character type: ${agentId}, setting to unknown`
                );
                agentId = "unknown";
            }

            const voice_id =
                agentId === "whitepill"
                    ? secrets.WHITEPILL_VOICE_ID
                    : agentId === "redpill"
                    ? secrets.REDPILL_VOICE_ID
                    : agentId === "blackpill"
                    ? secrets.BLACKPILL_VOICE_ID
                    : agentId === "narrator"
                    ? secrets.NARRATOR_VOICE_ID
                    : agentId === "bluepill"
                    ? secrets.BLUEPILL_VOICE_ID
                    : secrets.DEFAULT_VOICE_ID;

            console.log(
                `🎤 Selected voice_id for ${agentId}:`,
                voice_id ? "✅" : "❌"
            );

            try {
                console.log(
                    `🔊 Generating audio for entry ${i + 1}: "${text.substring(
                        0,
                        50
                    )}..."`
                );
                await generateAudio(voice_id ?? "", agentId, text, i, secrets);
                console.log(
                    `✅ Audio generated successfully for entry ${i + 1}`
                );

                audios.push({
                    agentId: agentId,
                    audio: `public/voice/${agentId}-${i}.mp3`,
                    index: i,
                    tweet_id: transcript[i].tweet_id,
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
