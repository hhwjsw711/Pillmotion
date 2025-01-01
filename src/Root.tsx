import { Composition, staticFile } from "remotion";
import { StorySchema, StoryComposition } from "./StoryComposition";
import "./style.css";
import { getAudioDuration } from "@remotion/media-utils";
import { MemeCoinSchema } from "./MemeCoinComposition";
import { MemeCoinComposition } from "./MemeCoinComposition";
import {
    initialAgentName,
    subtitlesFileName,
    fps,
    ticker,
    tradingViewSymbol,
    currentPrice,
    marketCap,
    percentageChange,
} from "./tmp/context";

export const RemotionRoot: React.FC = () => {
    return (
        <>
            <Composition
                id="Meme"
                component={MemeCoinComposition}
                fps={fps}
                width={1080}
                height={1920}
                schema={MemeCoinSchema}
                defaultProps={{
                    audioOffsetInSeconds: 0,
                    audioFileName: staticFile(`audio.mp3`),
                    titleText: "Back propagation",
                    titleColor: "rgba(186, 186, 186, 0.93)",
                    initialAgentName,
                    ticker,
                    tradingViewSymbol,
                    subtitlesFileName,
                    currentPrice,
                    marketCap,
                    percentageChange,
                    agentDetails: {
                        narrator: {
                            color: "#ffffff",
                            image: "narrator.png",
                        },
                        bluepill: {
                            color: "#ffffff",
                            image: "bluepill.png",
                        },
                        whitepill: {
                            color: "#ffffff",
                            image: "whitepill.png",
                        },
                        redpill: {
                            color: "#ffffff",
                            image: "redpill.png",
                        },
                        blackpill: {
                            color: "#ffffff",
                            image: "blackpill.png",
                        },
                        unknown: {
                            color: "#ffffff",
                            image: "unknown.png",
                        },
                    },
                    subtitlesTextColor: "rgba(255, 255, 255, 0.93)",
                    subtitlesLinePerPage: 6,
                    subtitlesZoomMeasurerSize: 10,
                    subtitlesLineHeight: 128,

                    // Wave settings
                    waveFreqRangeStartIndex: 7,
                    waveLinesToDisplay: 15,
                    waveNumberOfSamples: "256", // This is string for Remotion controls and will be converted to a number
                    mirrorWave: false,
                    durationInSeconds: 60,
                }}
                calculateMetadata={async ({ props }) => {
                    const duration =
                        (await getAudioDuration(staticFile(`audio.mp3`))) + 3;
                    return {
                        durationInFrames: Math.ceil(duration * fps),
                        props,
                    };
                }}
            />
            <Composition
                id="Story"
                component={StoryComposition}
                fps={fps}
                width={1080}
                height={1920}
                schema={StorySchema}
                defaultProps={{
                    audioOffsetInSeconds: 0,
                    audioFileName: staticFile(`audio.mp3`),
                    titleText: "Back propagation",
                    titleColor: "rgba(186, 186, 186, 0.93)",
                    initialAgentName: "narrator",
                    subtitlesFileName,
                    agentDetails: {
                        narrator: {
                            color: "#ffffff",
                            image: "narrator.png",
                        },
                        bluepill: {
                            color: "#ffffff",
                            image: "bluepill.png",
                        },
                        whitepill: {
                            color: "#ffffff",
                            image: "whitepill.png",
                        },
                        redpill: {
                            color: "#ffffff",
                            image: "redpill.png",
                        },
                        blackpill: {
                            color: "#ffffff",
                            image: "blackpill.png",
                        },
                        unknown: {
                            color: "#ffffff",
                            image: "unknown.png",
                        },
                    },
                    subtitlesTextColor: "rgba(255, 255, 255, 0.93)",
                    subtitlesLinePerPage: 6,
                    subtitlesZoomMeasurerSize: 10,
                    subtitlesLineHeight: 128,
                    waveFreqRangeStartIndex: 7,
                    waveLinesToDisplay: 15,
                    waveNumberOfSamples: "256",
                    mirrorWave: false,
                }}
                calculateMetadata={async ({ props }) => {
                    const duration =
                        (await getAudioDuration(staticFile(`audio.mp3`))) + 3;
                    return {
                        durationInFrames: Math.ceil(duration * fps),
                        props,
                    };
                }}
            />
        </>
    );
};
