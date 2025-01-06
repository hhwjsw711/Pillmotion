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
    MINIMAX_API_KEY: string;
    ELEVEN_API_KEY: string;
    NARRATOR_VOICE_ID: string;
    REDPILL_VOICE_ID: string;
    WHITEPILL_VOICE_ID: string;
    BLUEPILL_VOICE_ID: string;
    BLACKPILL_VOICE_ID: string;
    DEFAULT_VOICE_ID: string;
    SOCIAL_DATA_API_KEY: string;
}

interface Transcript {
    agentId: string;
    text: string;
}

interface StoryTranscript extends Transcript {
    order: number;
    componentOrder: number;
}

interface StoryTranscriptWithAgent extends StoryTranscript {
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
    agents: Agent[];
}

interface MemeCoinTranscript extends Transcript {
    tweet_id?: string;
}

interface MemeCoinTranscriptResponse {
    transcript: MemeCoinTranscript[];
    ticker: string;
    tradingViewSymbol: string;
    currentPrice: number;
    marketCap: number;
    percentageChange: number;
}

interface Tweet {
    full_text: string;
    user: {
        screen_name: string;
        followers_count: number;
    };
    id_str: string;
}

interface TradingViewSymbol {
    symbol: string;
    description: string;
    type: string;
    exchange: string;
}

interface TradingViewResponse {
    symbols: TradingViewSymbol[];
}

interface MarketData {
    price: number;
    volume: number;
    marketCap: number;
    change24h: number;
    symbol: string;
}

type AgentId = "bluepill" | "redpill" | "whitepill" | "blackpill" | "narrator";

type VideoType = "story" | "meme";

type Music = "wii" | "none" | "duck" | "monkey";
