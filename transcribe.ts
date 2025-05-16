import { generateTranscriptAudio } from "./audioGenerator.ts";
import concatenateAudioFiles from "./concat.ts";
import getAudioDuration from "./audioduration.ts";
import { generateCleanSrt } from "./cleanSrt.ts";

const transcribeAudio = async (audios: any) => {
    console.log("🎯 Starting transcribeAudio function");
    console.log("📦 Received audios:", audios);

    const retryDelays = [1000, 2000, 3000];
    let retryCount = 0;

    while (retryCount < retryDelays.length) {
        try {
            console.log(
                `🔄 Attempt ${retryCount + 1} of ${retryDelays.length}`
            );
            console.log("🌐 Making request to transcription service...");

            const response = await fetch("http://127.0.0.1:5005/transcribe", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ audios }),
            });

            if (!response.ok) {
                console.error(
                    "❌ Response not OK:",
                    response.status,
                    response.statusText
                );
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            console.log("✅ Response received successfully");
            const data = await response.json();
            console.log("📄 Received data:", JSON.stringify(data, null, 2));

            if (!Array.isArray(data)) {
                console.error("❌ Data is not an array:", data);
                throw new Error(
                    "Expected array response from transcription service"
                );
            }

            console.log("🔄 Processing transcription data...");
            return data.map(([transcription, audioPath]: any) => {
                console.log(`📝 Processing transcription for: ${audioPath}`);
                console.log("🔍 Transcription data:", transcription);

                if (!transcription || !transcription.segments) {
                    console.error(
                        "❌ Invalid transcription format:",
                        transcription
                    );
                    throw new Error(
                        `Invalid transcription format for ${audioPath}`
                    );
                }

                const processedTranscription = {
                    ...transcription,
                    segments: transcription.segments.map((segment: any) => {
                        console.log("➡️ Processing segment:", segment);
                        return {
                            ...segment,
                            words:
                                segment.words ||
                                segment.text
                                    .split(" ")
                                    .map((word: any, index: any) => {
                                        const wordTiming = {
                                            text: word,
                                            start:
                                                segment.start +
                                                index *
                                                    ((segment.end -
                                                        segment.start) /
                                                        segment.text.split(" ")
                                                            .length),
                                            end:
                                                segment.start +
                                                (index + 1) *
                                                    ((segment.end -
                                                        segment.start) /
                                                        segment.text.split(" ")
                                                            .length),
                                        };
                                        console.log(
                                            "📊 Generated word timing:",
                                            wordTiming
                                        );
                                        return wordTiming;
                                    }),
                        };
                    }),
                };

                console.log("✅ Successfully processed transcription");
                return [processedTranscription, audioPath];
            });
        } catch (error) {
            console.error(`❌ Error in attempt ${retryCount + 1}:`, error);
            console.error("🔍 Error details:", {
                name: (error as Error).name,
                message: (error as Error).message,
                stack: (error as Error).stack,
            });

            if (retryCount < retryDelays.length - 1) {
                const delay = retryDelays[retryCount];
                console.log(`⏳ Retrying in ${delay / 1000} second(s)...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
            } else {
                console.error("❌ All retry attempts failed");
                throw error;
            }

            retryCount++;
        }
    }
};

function srtTimeToSeconds(srtTime: string) {
    const [hours, minutes, secondsAndMillis] = srtTime.split(":");
    const [seconds, milliseconds] = secondsAndMillis.split(",");
    return (
        Number(hours) * 3600 +
        Number(minutes) * 60 +
        Number(seconds) +
        Number(milliseconds) / 1000
    );
}

function secondsToSrtTime(seconds: number) {
    const pad = (num: number, size: number) => String(num).padStart(size, "0");
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.round((seconds % 1) * 1000);
    return `${pad(hrs, 2)}:${pad(mins, 2)}:${pad(secs, 2)},${pad(millis, 3)}`;
}

export default async function transcribe(
    transcript: Transcript[],
    secrets: VideoSecrets,
    generatedAudioData: AudioInfo[]
) {
    // const { audios } = await generateTranscriptAudio(transcript, secrets);
    let startingTime = 0;

    console.log("🎬 Initial startingTime:", startingTime);
    concatenateAudioFiles();

    const transcriptionResults = await transcribeAudio(
        generatedAudioData.map((audio) => audio.audio)
    );

    if (!transcriptionResults) {
        throw new Error("Failed to get transcription results");
    }

    const uncleanSrtContentArr = [];

    for (let i = 0; i < transcriptionResults.length; i++) {
        console.log(`\n🎯 Processing SRT #${i} ==================`);
        const transcription = transcriptionResults[i][0];
        const audio = generatedAudioData[i];
        console.log(`📝 Processing audio: ${audio.audio}`);
        console.log(`⏰ Current startingTime: ${startingTime}`);

        let srtIndex = 1;
        let srtContent = "";

        const words = transcription.segments.flatMap(
            (segment: any) => segment.words
        );

        console.log(`🔤 Total words in segment: ${words.length}`);

        for (let j = 0; j < words.length; j++) {
            const word = words[j];
            const nextWord = words[j + 1];

            const wordStartTime = word.start + startingTime;
            let wordEndTime;

            if (nextWord) {
                wordEndTime = nextWord.start + startingTime;
            } else {
                wordEndTime = word.end + startingTime;
            }

            const startTime = secondsToSrtTime(wordStartTime);
            const endTime = secondsToSrtTime(wordEndTime);

            console.log(`📊 Word "${word.text}":
				- Raw start: ${word.start}
				- Adjusted start: ${wordStartTime}
				- Formatted start: ${startTime}
				- End: ${endTime}`);

            srtContent += `${srtIndex}\n${startTime} --> ${endTime}\n${word.text}\n\n`;
            srtIndex++;
        }

        const lines = srtContent.split("\n");
        console.log(`📑 Generated ${lines.length} lines for SRT #${i}`);

        const incrementedSrtLines = lines.map((line) => {
            const timeMatch = line.match(
                /(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/
            );
            if (timeMatch) {
                const startTime = srtTimeToSeconds(timeMatch[1]);
                const endTime = srtTimeToSeconds(timeMatch[2]);
                return `${secondsToSrtTime(startTime)} --> ${secondsToSrtTime(
                    endTime
                )}`;
            }
            return line;
        });

        const srtFileName = audio.audio
            .replace("public/voice/", "")
            .replace(".mp3", ".srt");

        uncleanSrtContentArr.push({
            content: incrementedSrtLines.join("\n"),
            fileName: srtFileName,
        });

        console.log(`✅ Completed SRT #${i}`);
        console.log(`📁 Saved to: ${srtFileName}`);
        const currentDuration = transcription.segments.reduce(
            (acc: number, segment: any) => {
                return Math.max(acc, segment.end);
            },
            0
        );
        console.log(`⏱️ Current segment duration: ${currentDuration} seconds`);
        const duration = (await getAudioDuration(audio.audio)) as number;
        startingTime += duration + 0.25;
        console.log(`⏱️ New startingTime after gap: ${startingTime}`);
    }

    console.log(`\n🎉 Final startingTime: ${startingTime}`);
    await generateCleanSrt(transcript, uncleanSrtContentArr, secrets);
}
