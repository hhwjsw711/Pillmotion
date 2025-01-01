import { getRandomEmoji } from "./utils/emoji";

function generateSegmentBoundaries(
    transcript: StoryTranscript[],
    storyComponents: StoryComponent[]
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

function invariantContext(context: string) {
    if (!context.includes("initialAgentName")) {
        throw new Error("initialAgentName is required in context");
    }
    if (!context.includes("subtitlesFileName")) {
        throw new Error("subtitlesFileName is required in context");
    }
    if (
        context.includes("storyName") &&
        !context.includes("segmentBoundaries")
    ) {
        throw new Error("segmentBoundaries is required for story contexts");
    }

    // Optional fields with defaults
    let updatedContext = context;

    if (!context.includes("fps")) {
        updatedContext += "\nexport const fps = 60;";
    }

    // Meme-specific fields
    if (!context.includes("ticker")) {
        updatedContext += '\nexport const ticker = "";';
    }
    if (!context.includes("tradingViewSymbol")) {
        updatedContext += '\nexport const tradingViewSymbol = "";';
    }
    if (!context.includes("currentPrice")) {
        updatedContext += "\nexport const currentPrice = 0;";
    }
    if (!context.includes("marketCap")) {
        updatedContext += "\nexport const marketCap = 0;";
    }
    if (!context.includes("percentageChange")) {
        updatedContext += "\nexport const percentageChange = 0;";
    }

    // Story-specific fields
    if (!context.includes("seasonNumber")) {
        updatedContext += "\nexport const seasonNumber = 1;";
    }
    if (!context.includes("storyName")) {
        updatedContext += '\nexport const storyName = "";';
    }
    if (!context.includes("seasonName")) {
        updatedContext += '\nexport const seasonName = "";';
    }
    if (!context.includes("episodeNumber")) {
        updatedContext += "\nexport const episodeNumber = 1;";
    }
    if (!context.includes("segmentBoundaries")) {
        updatedContext += `\nexport const segmentBoundaries = {
    0: {
        title: "🎬 Default Scene",
        location: "Unknown Location",
        description: "Default scene description",
        endIndex: 0
    }
};`;
    }

    return updatedContext;
}

export function generateStoryContextContent(
    audios: {
        agentId: string;
        audio: string;
        index: number;
    }[],
    transcript: StoryTranscript[],
    season: Season,
    story: Story,
    storyComponents: StoryComponent[]
): string {
    const context = `
import { staticFile } from 'remotion';

export const music: string = 'none';
export const fps = 60;

export const seasonNumber = 1; 
export const seasonName = '${season.title}';
export const episodeNumber = ${story.episode_number};
export const storyName = '${story.title}';

export const segmentBoundaries = {
    ${generateSegmentBoundaries(transcript, storyComponents)}
};

export const initialAgentName = '${audios[0].agentId}';

export const subtitlesFileName = [
    ${audios
        .map(
            (entry) => `{
        name: '${entry.agentId}',
        file: staticFile('srt/${entry.agentId}-${entry.index}.srt'),
    }`
        )
        .join(",\n    ")}
];`;

    return invariantContext(context);
}

export function generateMemeContextContent(
    audios: {
        agentId: string;
        audio: string;
        index: number;
        tweet_id?: string;
    }[],
    agentA: AgentId,
    agentB: AgentId,
    duration: number,
    fps: number = 60,
    music: Music = "none",
    ticker: string,
    tradingViewSymbol: string,
    currentPrice: number,
    marketCap: number,
    percentageChange: number
): string {
    const context = `
import { staticFile } from 'remotion';

export const music: string = ${
        music === "none" ? `'none'` : `'/music/${music}.mp3'`
    };
export const fps = ${fps};
export const duration = ${duration * 60};

export const agentA = '${agentA}';
export const agentB = '${agentB}';

export const initialAgentName = '${audios[0].agentId}';
export const ticker = '${ticker}';
export const tradingViewSymbol = '${tradingViewSymbol}';
export const currentPrice = ${currentPrice};
export const marketCap = ${marketCap};
export const percentageChange = ${percentageChange};

export const subtitlesFileName = [
    ${audios
        .map(
            (entry) => `{
        name: '${entry.agentId}',
        file: staticFile('srt/${entry.agentId}-${entry.index}.srt'),
        ${entry.tweet_id ? `tweet_id: '${entry.tweet_id}',` : ""}
    }`
        )
        .join(",\n    ")}
];`;

    return invariantContext(context);
}
