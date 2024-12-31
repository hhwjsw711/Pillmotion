import { useAudioData, visualizeAudio } from "@remotion/media-utils";
import React, { useEffect, useRef, useState } from "react";
import {
    AbsoluteFill,
    Audio,
    continueRender,
    Img,
    Sequence,
    staticFile,
    useCurrentFrame,
    useVideoConfig,
    interpolate,
} from "remotion";
import {
    fps,
    music,
    seasonNumber,
    storyName,
    seasonName,
    episodeNumber,
    segmentBoundaries,
} from "./tmp/context";
import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import { Card } from "../components/ui/card";
import { PaginatedSubtitles } from "./Subtitles";

export type WordTiming = {
    word: string;
    start: number;
    end: number;
};

export type SubtitleEntry = {
    index: string;
    startTime: number;
    endTime: number;
    text: string;
    srt: string;
    srtFileIndex: number;
    wordTimings: WordTiming[];
};

const AgentDetailsSchema = z.record(
    z.object({
        color: zColor(),
        image: z.string().refine((s) => s.endsWith(".png"), {
            message: "Agent image must be a .png file",
        }),
    })
);

const srtTimeToSeconds = (srtTime: string) => {
    const [hours, minutes, secondsAndMillis] = srtTime.split(":");
    const [seconds, milliseconds] = secondsAndMillis.split(",");
    return (
        Number(hours) * 3600 +
        Number(minutes) * 60 +
        Number(seconds) +
        Number(milliseconds) / 1000
    );
};

const parseSRT = (
    srtContent: string,
    srtFileIndex: number
): SubtitleEntry[] => {
    const blocks = srtContent.split("\n\n");
    const MIN_DURATION = 0.5;

    const preliminaryEntries = blocks
        .map((block) => {
            const lines = block.split("\n");
            const indexLine = lines[0];
            const timeLine = lines[1];

            if (!indexLine || !timeLine || lines.length < 3) {
                return null;
            }

            const [startTime, endTime] = timeLine
                .split(" --> ")
                .map(srtTimeToSeconds);

            const textLines = lines.slice(2).join(" ");

            // Calculate word timings
            const words = textLines.split(" ");
            const timePerWord = (endTime - startTime) / words.length;
            const wordTimings = words.map((word, idx) => ({
                word,
                start: startTime + idx * timePerWord,
                end: startTime + (idx + 1) * timePerWord,
            }));

            return {
                index: indexLine,
                startTime,
                endTime,
                text: textLines,
                srt: block,
                srtFileIndex,
                wordTimings,
            };
        })
        .filter((entry): entry is SubtitleEntry => entry !== null);

    const combinedEntries: SubtitleEntry[] = [];
    let currentEntry: SubtitleEntry | null = null;
    let accumulatedText: string[] = [];
    let accumulatedWordTimings: WordTiming[] = [];

    for (const entry of preliminaryEntries) {
        if (!currentEntry) {
            currentEntry = entry;
            accumulatedText = [entry.text];
            accumulatedWordTimings = [...entry.wordTimings];
            continue;
        }

        const currentDuration = currentEntry.endTime - currentEntry.startTime;

        if (currentDuration < MIN_DURATION) {
            accumulatedText.push(entry.text);
            accumulatedWordTimings.push(...entry.wordTimings);
            currentEntry = {
                ...currentEntry,
                endTime: entry.endTime,
                text: accumulatedText.join(" "),
                wordTimings: accumulatedWordTimings,
                srt: `${currentEntry.index}\n${secondsToSrtTime(
                    currentEntry.startTime
                )} --> ${secondsToSrtTime(
                    entry.endTime
                )}\n${accumulatedText.join(" ")}`,
            };
        } else {
            combinedEntries.push(currentEntry);
            currentEntry = entry;
            accumulatedText = [entry.text];
            accumulatedWordTimings = [...entry.wordTimings];
        }
    }

    if (currentEntry) {
        combinedEntries.push(currentEntry);
    }

    return combinedEntries;
};

// Helper function to convert seconds back to SRT time format
const secondsToSrtTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
        2,
        "0"
    )}:${String(secs).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
};

const SubtitleFileSchema = z.object({
    name: z.string(),
    file: z.string().refine((s) => s.endsWith(".srt"), {
        message: "Subtitle file must be a .srt file",
    }),
});

export const AudioGramSchema = z.object({
    initialAgentName: z.string(),
    agentDetails: AgentDetailsSchema,
    audioOffsetInSeconds: z.number().min(0),
    subtitlesFileName: z.array(SubtitleFileSchema),
    audioFileName: z.string().refine((s) => s.endsWith(".mp3"), {
        message: "Audio file must be a .mp3 file",
    }),
    titleText: z.string(),
    titleColor: zColor(),
    subtitlesTextColor: zColor(),
    subtitlesLinePerPage: z.number().int().min(0),
    subtitlesLineHeight: z.number().int().min(0),
    subtitlesZoomMeasurerSize: z.number().int().min(0),
    mirrorWave: z.boolean(),
    waveLinesToDisplay: z.number().int().min(0),
    waveFreqRangeStartIndex: z.number().int().min(0),
    waveNumberOfSamples: z.enum(["32", "64", "128", "256", "512"]),
});

type AudiogramCompositionSchemaType = z.infer<typeof AudioGramSchema>;

const AudioViz: React.FC<{
    numberOfSamples: number;
    freqRangeStartIndex: number;
    waveColor: string;
    waveLinesToDisplay: number;
    mirrorWave: boolean;
    audioSrc: string;
}> = ({
    numberOfSamples,
    waveColor,
    freqRangeStartIndex,
    waveLinesToDisplay,
    mirrorWave,
    audioSrc,
}) => {
    const frame = useCurrentFrame();

    const audioData = useAudioData(audioSrc);

    if (!audioData) {
        return null;
    }

    const frequencyData = visualizeAudio({
        fps,
        frame,
        audioData,
        numberOfSamples, // Use more samples to get a nicer visualisation
    });

    // Pick the low values because they look nicer than high values
    // feel free to play around :)
    const frequencyDataSubset = frequencyData.slice(
        freqRangeStartIndex,
        freqRangeStartIndex +
            (mirrorWave
                ? Math.round(waveLinesToDisplay / 2)
                : waveLinesToDisplay)
    );

    const frequencesToDisplay = mirrorWave
        ? [...frequencyDataSubset.slice(1).reverse(), ...frequencyDataSubset]
        : frequencyDataSubset;

    return (
        <div className="transition-all audio-viz z-30">
            {frequencesToDisplay.map((v, i) => {
                return (
                    <div
                        key={i}
                        className={`z-30 bar `}
                        style={{
                            backgroundColor: waveColor,
                            minWidth: "1px",
                            opacity: 0.5,
                            height: `${200 * Math.sqrt(v)}%`,
                        }}
                    />
                );
            })}
        </div>
    );
};

// Add this helper function
const getTimeEmoji = (hour: number): string => {
    if (hour >= 5 && hour < 8) return "🌄"; // Dawn
    if (hour >= 8 && hour < 12) return "🌅"; // Morning
    if (hour >= 12 && hour < 15) return "☀️"; // Noon
    if (hour >= 15 && hour < 18) return "🌤️"; // Afternoon
    if (hour >= 18 && hour < 20) return "🌇"; // Sunset
    if (hour >= 20 && hour < 23) return "🌙"; // Evening
    return "🌚"; // Late night
};

// Add this helper function at the top of your component
const getSegmentTitleForIndex = (index: number): string => {
    const segmentStart = Object.keys(segmentBoundaries)
        .map(Number)
        .sort((a, b) => a - b)
        .find(
            (start) =>
                index >= start &&
                index <=
                    segmentBoundaries[start as keyof typeof segmentBoundaries]
                        .endIndex
        );

    return segmentStart !== undefined
        ? segmentBoundaries[segmentStart as keyof typeof segmentBoundaries]
              .title
        : "";
};

const getSegmentLocationForIndex = (index: number): string => {
    const segmentStart = Object.keys(segmentBoundaries)
        .map(Number)
        .sort((a, b) => a - b)
        .find(
            (start) =>
                index >= start &&
                index <=
                    segmentBoundaries[start as keyof typeof segmentBoundaries]
                        .endIndex
        );

    return segmentStart !== undefined
        ? segmentBoundaries[segmentStart as keyof typeof segmentBoundaries]
              .location
        : "";
};

export const AudiogramComposition: React.FC<AudiogramCompositionSchemaType> = ({
    subtitlesFileName,
    agentDetails,
    audioFileName,
    subtitlesLinePerPage,
    initialAgentName,
    waveNumberOfSamples,
    waveFreqRangeStartIndex,
    waveLinesToDisplay,
    subtitlesZoomMeasurerSize,
    subtitlesLineHeight,
    mirrorWave,
    audioOffsetInSeconds,
}) => {
    const [currentAgentName, setCurrentAgentName] = useState<string>("");
    const { durationInFrames, fps } = useVideoConfig();
    const frame = useCurrentFrame();
    const [subtitlesData, setSubtitlesData] = useState<SubtitleEntry[]>([]);
    const [currentSubtitle, setCurrentSubtitle] =
        useState<SubtitleEntry | null>(null);
    const [handle] = useState<number | null>(null);
    const ref = useRef<HTMLDivElement>(null);
    const [lastValidSegmentTitle, setLastValidSegmentTitle] =
        useState<string>("");
    const [lastValidSegmentLocation, setLastValidSegmentLocation] =
        useState<string>("");

    // Smoother interpolation values
    const cardScale = interpolate(
        frame,
        [0, 30], // Animate over first 30 frames
        [0.8, 1], // Start at 80% scale, end at 100%
        {
            extrapolateRight: "clamp",
            extrapolateLeft: "clamp",
            easing: (t) => Math.sin((t * Math.PI) / 2), // Smooth easing
        }
    );

    const cardY = interpolate(
        frame,
        [0, 30],
        [50, 0], // Start 50px down, move to final position
        {
            extrapolateRight: "clamp",
            extrapolateLeft: "clamp",
            easing: (t) => 1 - Math.pow(1 - t, 3), // Cubic easing
        }
    );

    const cardOpacity = interpolate(frame, [0, 20], [0, 1], {
        extrapolateRight: "clamp",
        extrapolateLeft: "clamp",
    });

    // Add these interpolations at the top of your component
    const imageScale = interpolate(frame, [0, 30], [0.8, 1], {
        extrapolateRight: "clamp",
        extrapolateLeft: "clamp",
        easing: (t) => Math.sin((t * Math.PI) / 2), // Smooth easing
    });

    const imageOpacity = interpolate(frame, [0, 20], [0, 1], {
        extrapolateRight: "clamp",
        extrapolateLeft: "clamp",
    });

    // Determine the current subtitle and agent based on the frame
    useEffect(() => {
        if (subtitlesData.length > 0) {
            const currentTime = frame / fps;
            const currentSubtitle = subtitlesData.find(
                (subtitle) =>
                    currentTime >= subtitle.startTime &&
                    currentTime < subtitle.endTime
            );

            if (currentSubtitle) {
                setCurrentSubtitle(currentSubtitle);
                // Use the srtFileIndex to find the corresponding agent name
                const agentInfo =
                    subtitlesFileName[currentSubtitle.srtFileIndex];
                setCurrentAgentName(agentInfo.name);
            }
        }
    }, [frame, fps, subtitlesData, subtitlesFileName]);

    // Fetch and parse all SRT files
    useEffect(() => {
        const fetchSubtitlesData = async () => {
            try {
                const data = await Promise.all(
                    subtitlesFileName.map(async ({ file }, index) => {
                        // Pass the index to parseSRT
                        const response = await fetch(file);
                        const text = await response.text();
                        return parseSRT(text, index);
                    })
                );
                setSubtitlesData(
                    data.flat().sort((a, b) => a.startTime - b.startTime)
                );
                console.log(
                    "Subtitles data:",
                    data.flat().sort((a, b) => a.startTime - b.startTime)
                );
            } catch (error) {
                console.error("Error fetching subtitles:", error);
            }
        };

        fetchSubtitlesData();
    }, [subtitlesFileName]);

    // Determine the current subtitle based on the frame
    useEffect(() => {
        if (subtitlesData.length > 0) {
            const currentTime = frame / fps;
            const current = subtitlesData.find(
                (subtitle) =>
                    currentTime >= subtitle.startTime &&
                    currentTime < subtitle.endTime
            );
            setCurrentSubtitle(current || null);
        }
    }, [frame, fps, subtitlesData]);

    // Ensure that the delayRender handle is cleared when the component unmounts
    useEffect(() => {
        return () => {
            if (handle !== null) {
                continueRender(handle);
            }
        };
    }, [handle]);

    const audioOffsetInFrames = Math.round(audioOffsetInSeconds * fps);

    // Update the useEffect that handles segment changes
    useEffect(() => {
        if (currentSubtitle) {
            const currentSegmentTitle = getSegmentTitleForIndex(
                currentSubtitle.srtFileIndex
            );
            const currentSegmentLocation = getSegmentLocationForIndex(
                currentSubtitle.srtFileIndex
            );

            if (currentSegmentTitle) {
                setLastValidSegmentTitle(currentSegmentTitle);
            }

            if (currentSegmentLocation) {
                setLastValidSegmentLocation(currentSegmentLocation);
            }
        }
    }, [currentSubtitle, frame]);

    return (
        <div ref={ref}>
            <AbsoluteFill>
                <div className="absolute inset-0 w-full h-full -z-30">
                    <img
                        src={staticFile(
                            currentSubtitle
                                ? getSegmentLocationForIndex(
                                      currentSubtitle.srtFileIndex
                                  ) + ".png"
                                : lastValidSegmentLocation + ".png"
                        )}
                        className="w-full h-full object-cover"
                        alt="background"
                    />
                </div>
                <Sequence from={-audioOffsetInFrames}>
                    {/*@ts-ignore */}
                    <Audio src={audioFileName} />
                    {music !== "NONE" && (
                        <Audio volume={0.25} src={staticFile(music)} />
                    )}
                    <div className="relative -z-20 flex flex-col w-full h-full font-remotionFont">
                        <div className="relative w-full h-full">
                            <div className="absolute left-12 top-64 flex items-start flex-col gap-4 z-30">
                                <Card
                                    className="backdrop-blur-sm bg-black/50 p-8 w-[750px] rounded-3xl border border-white/10 shadow-2xl"
                                    style={{
                                        transform: `scale(${cardScale}) translateY(${cardY}px)`,
                                        opacity: cardOpacity,
                                    }}
                                >
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="text-3xl text-gray-300"
                                                    style={{
                                                        textShadow:
                                                            "2px 2px 0px rgba(0, 0, 0, 0.5)",
                                                    }}
                                                >
                                                    {getTimeEmoji(
                                                        new Date().getHours()
                                                    )}{" "}
                                                    {new Date().toLocaleDateString(
                                                        "en-US",
                                                        {
                                                            month: "short",
                                                            day: "numeric",
                                                            year: "numeric",
                                                        }
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-3xl text-gray-400">
                                                Season {seasonNumber} • Episode{" "}
                                                {episodeNumber}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <div className="text-4xl text-gray-400 font-medium">
                                                {seasonName}
                                            </div>
                                            <div className="text-5xl text-white font-bold">
                                                {storyName.length > 50
                                                    ? storyName.substring(
                                                          0,
                                                          50
                                                      ) + "..."
                                                    : storyName}
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                <div className="flex flex-row gap-24 items-end h-full p-8 z-30">
                                    <div className="flex flex-col items-center gap-4">
                                        {agentDetails[
                                            currentAgentName || initialAgentName
                                        ].image !== "transparent.png" && (
                                            <Img
                                                width={150}
                                                height={150}
                                                className="z-30 border-2 shadow-md rounded-full"
                                                style={{
                                                    opacity: imageOpacity,
                                                    transform: `scale(${imageScale})`,
                                                }}
                                                src={staticFile(
                                                    `/${
                                                        agentDetails[
                                                            currentAgentName ||
                                                                initialAgentName
                                                        ].image
                                                    }`
                                                )}
                                            />
                                        )}
                                        <div
                                            className="text-4xl font-bold text-white"
                                            style={{
                                                textShadow:
                                                    "4px 4px 0px rgba(0, 0, 0, 0.5)",
                                                opacity: imageOpacity,
                                            }}
                                        >
                                            {currentAgentName ||
                                                initialAgentName}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center gap-4">
                                        <AudioViz
                                            audioSrc={audioFileName}
                                            mirrorWave={mirrorWave}
                                            waveColor={
                                                agentDetails[
                                                    currentAgentName ||
                                                        initialAgentName
                                                ].color
                                            }
                                            numberOfSamples={Number(
                                                waveNumberOfSamples
                                            )}
                                            freqRangeStartIndex={
                                                waveFreqRangeStartIndex
                                            }
                                            waveLinesToDisplay={
                                                waveLinesToDisplay
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className=" w-full h-full ">
                                <div
                                    style={{
                                        textShadow:
                                            "6px 6px 0px rgba(0, 0, 0, 0.5)",
                                    }}
                                    className="z-10 absolute text-center text-7xl drop-shadow-2xl text-white bottom-12 right-12"
                                >
                                    <p>TITLE HERE</p>
                                </div>
                                <Card
                                    style={{
                                        transform: `translate(-50%, -50%) scale(${cardScale}) translateY(${cardY}px)`,
                                        opacity: cardOpacity,
                                    }}
                                    className="bg-black/50 mx-auto top-[50%] left-1/2 absolute p-8 rounded-3xl border border-white/10 shadow-2xl"
                                >
                                    <div className="flex flex-col gap-2">
                                        <div className="text-5xl text-gray-200">
                                            {currentSubtitle
                                                ? getSegmentTitleForIndex(
                                                      currentSubtitle.srtFileIndex
                                                  )
                                                : lastValidSegmentTitle}
                                        </div>
                                        <div className="text-3xl text-gray-400">
                                            {currentSubtitle
                                                ? getSegmentLocationForIndex(
                                                      currentSubtitle.srtFileIndex
                                                  )
                                                : lastValidSegmentLocation}
                                        </div>
                                    </div>
                                </Card>
                                <div
                                    style={{
                                        lineHeight: `${subtitlesLineHeight}px`,
                                        textShadow:
                                            "6px 6px 0px rgba(0, 0, 0, 0.5)",
                                    }}
                                    className="z-10 absolute text-center text-7xl drop-shadow-2xl text-white mx-24 top-[60%] left-0 right-0 -translate-y-1/2"
                                >
                                    <PaginatedSubtitles
                                        fps={fps}
                                        startFrame={audioOffsetInFrames}
                                        endFrame={
                                            audioOffsetInFrames +
                                            durationInFrames
                                        }
                                        linesPerPage={subtitlesLinePerPage}
                                        subtitlesZoomMeasurerSize={
                                            subtitlesZoomMeasurerSize
                                        }
                                        subtitlesLineHeight={
                                            subtitlesLineHeight
                                        }
                                        subtitlesData={subtitlesData}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </Sequence>
            </AbsoluteFill>
        </div>
    );
};
