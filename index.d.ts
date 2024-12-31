interface Season {
    id: string;
    title: string;
    description: string;
    status: SeasonStatus;
    metadata: SeasonMetadata;
    createdAt: number;
    updatedAt: number;
}

interface Story {
    id: string;
    createdAt: string;
    title: string;
    season_id: string;
    episode_number: number;
    summary: string;
    audio_url: string | null;
    video_url: string | null;
    status: "draft" | "published";
    published_at: string | null;
    updatedAt: string;
}

interface VideoSecrets {
    OPENAI_API_KEY: string;
    CLAUDE_API_KEY: string;
    ELEVEN_API_KEY: string;
    NARRATOR_VOICE_ID: string;
    REDPILL_VOICE_ID: string;
    WHITEPILL_VOICE_ID: string;
    BLUEPILL_VOICE_ID: string;
    BLACKPILL_VOICE_ID: string;
    DEFAULT_VOICE_ID: string;
}

interface Transcript {
    id: string;
    agentId: string;
    text: string;
    order: number;
    componentOrder: number;
}

interface TranscriptWithAgent extends Transcript {
    agent: Agent;
}

interface Agent {
    name: string;
    description: string;
    personality: {
        traits?: string[];
        quirks?: string[];
        values?: string[];
        flaws?: string[];
    };
    knowledge: {
        expertise?: string[];
        interests?: string[];
        background?: string[];
    };
    lore: {
        backstory?: string[];
        relationships?: {
            agentId: string;
            type: string;
            description: string;
        }[];
        affiliations?: string[];
    };
    goals: {
        longTerm?: string[];
        shortTerm?: string[];
        motivations?: string[];
    };
}

interface StoryComponent {
    id: string;
    episodeId: string;
    description: string;
    title: string;
    type: "scene" | "transition" | "montage";
    characters: string[];
    location?: StoryLocation;
    timeframe?: string;
    order: number;
}

interface StoryLocation {
    id: string;
    name: string;
    description: string;
    type: "city" | "country" | "region" | "indoor" | "outdoor" | "vehicle";
}

interface StoryComponentWithAgent extends StoryComponent {
    characters: Agent[];
}
