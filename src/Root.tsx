import { Composition, staticFile } from "remotion";
import { AudioGramSchema, AudiogramComposition } from "./Composition";
import "./style.css";
import { subtitlesFileName, fps } from "./tmp/context";
import { getAudioDuration } from "@remotion/media-utils";

export const RemotionRoot: React.FC = () => {
    return (
        <>
            <Composition
                id="Video"
                component={AudiogramComposition}
                fps={fps}
                width={1080}
                height={1920}
                schema={AudioGramSchema}
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
