import { getTokenMarketData } from "./utils/raydiumSymbolLookup";
import { OpenAI } from "openai";
import { getRecentTweets } from "./utils/twitter";
import {
    bluepill,
    redpill,
    whitepill,
    blackpill,
    narrator,
} from "./data/agents";

const agentsMap = {
    bluepill,
    redpill,
    whitepill,
    blackpill,
    narrator,
};

function getAgentRelationship(agentA: AgentId, agentB: AgentId): string {
    const relationshipA = agentsMap[agentA].lore.relationships?.find(
        (r) => r.agentId === agentB || r.agentId === agentB
    );
    const relationshipB = agentsMap[agentB].lore.relationships?.find(
        (r) => r.agentId === agentA || r.agentId === agentA
    );

    return `Relationship Context:
${agentA.toUpperCase()}'s view of ${agentB.toUpperCase()}: ${
        relationshipA?.type || "neutral"
    } - ${relationshipA?.description || "No specific relationship"}
${agentB.toUpperCase()}'s view of ${agentA.toUpperCase()}: ${
        relationshipB?.type || "neutral"
    } - ${relationshipB?.description || "No specific relationship"}`;
}

export default async function generateMemeCoinTranscript(
    agentA: AgentId,
    agentB: AgentId,
    solMemeCoinTicker: string,
    duration: number,
    secrets: VideoSecrets
): Promise<MemeCoinTranscriptResponse> {
    console.log("📖 Reading tweets from file...");
    const tweets = await getRecentTweets(
        `${solMemeCoinTicker.toUpperCase()} since_time:${
            Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 7
        }`,
        100,
        secrets
    );
    console.log(`📊 Loaded ${tweets.length} tweets`);
    console.log("\n🔍 Searching for market data of token...");

    const openai = new OpenAI({
        apiKey: secrets.MINIMAX_API_KEY,
        baseURL: "https://api.minimax.chat/v1"
    });

    let foundValidToken = false;
    let validToken: string | null = null;
    let marketData: MarketData | null = null;
    try {
        console.log(`\n📊 Checking $${solMemeCoinTicker}...`);
        marketData = await getTokenMarketData(`$${solMemeCoinTicker}`);
        console.log(`✅ Found valid token $${solMemeCoinTicker}!`);
        console.log(`💰 Price: $${marketData.price}`);
        console.log(`📈 24h Change: ${marketData.change24h}%`);
        console.log(`💎 Market Cap: $${marketData.marketCap}`);
        console.log(`📊 24h Volume: $${marketData.volume}`);
        foundValidToken = true;
        validToken = solMemeCoinTicker;
    } catch (error) {
        console.log(
            `❌ Couldn't get market data for $${solMemeCoinTicker}: ${
                error instanceof Error ? error.message : "Unknown error"
            }`
        );
    }
    if (!validToken) {
        throw new Error("No valid tokens found with market data");
    }

    if (!marketData) {
        throw new Error("No valid market data found");
    }

    if (!foundValidToken) {
        console.log("❌ No valid tokens found with market data");
    } else {
        console.log(`\n🔍 Finding tweets mentioning $${validToken}...`);
        const relevantTweets = tweets
            .filter((tweet: Tweet) =>
                tweet.full_text.toUpperCase().includes(`${validToken}`)
            )
            .sort(
                (a: Tweet, b: Tweet) =>
                    (b.user.followers_count || 0) -
                    (a.user.followers_count || 0)
            )
            .slice(0, 10);

        console.log(
            `\n📝 Found ${relevantTweets.length} most influential tweets mentioning $${validToken}:`
        );
        relevantTweets.forEach((tweet: Tweet, index: number) => {
            console.log(`\n🐦 Tweet ${index + 1}:`);
            console.log(
                `👤 @${
                    tweet.user.screen_name
                } (${tweet.user.followers_count.toLocaleString()} followers):`
            );
            console.log(`💬 ${tweet.full_text}`);
            console.log(
                `🔗 https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`
            );
        });

        console.log("📝 Generating transcript...");

        console.log(
            "📝 Starting generateTranscript with token data and tweets"
        );

        const formattedTweets = relevantTweets
            .map(
                (tweet: Tweet, index: number) =>
                    `Tweet ${index + 1}:
            @${tweet.user.screen_name}: ${tweet.full_text}
            ID: ${tweet.id_str}`
            )
            .join("\n\n");

        let content = "";
        try {
            console.log("🤖 Creating OpenAI chat completion...");
            const relationshipContext = getAgentRelationship(agentA, agentB);
            const completion = await openai.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `Create a dialogue analyzing a cryptocurrency token. The conversation should be between two agents:
                ${relationshipContext}

                # ${agentA}: ${agentA.toUpperCase()}: ${
                            agentsMap[agentA].description
                        },
                ## Personality:
                - Flaws: ${agentsMap[agentA].personality?.flaws?.join(", ")}
                - Quirks: ${agentsMap[agentA].personality?.quirks?.join(", ")}
                - Values: ${agentsMap[agentA].personality?.values?.join(", ")}
                - Traits: ${agentsMap[agentA].personality?.traits?.join(", ")}

                # ${agentB}: ${agentB.toUpperCase()}: ${
                            agentsMap[agentB].description
                        }
                ## Personality:
                - Flaws: ${agentsMap[agentB].personality?.flaws?.join(", ")}
                - Quirks: ${agentsMap[agentB].personality?.quirks?.join(", ")}
                - Values: ${agentsMap[agentB].personality?.values?.join(", ")}
                - Traits: ${agentsMap[agentB].personality?.traits?.join(", ")}

                Token Data:
                - Symbol: $${validToken}
                - Price: $${marketData.price}
                - 24h Change: ${marketData.change24h}%
                ${
                    marketData.marketCap && marketData.marketCap > 0
                        ? `- Market Cap: $${marketData.marketCap}`
                        : ""
                }
                - 24h Volume: $${marketData.volume}

                Recent Community Tweets:
                ${formattedTweets}

                The dialogue should analyze:
                - Current price action and market sentiment
                - Trading volume and market cap analysis
                - Community engagement based on the provided tweets
                - Potential risks and opportunities

                Tweet Reference Rules:
                - 2-6 tweets should be used in the conversation
                - a tweet_id should only be associated with ONE dialog exchange
                - the tweets passed in should give context as to what this coin is, the agents should not be directly referencing any tweets in their text.
                - spread tweet references throughout the transcript evenly to show community engagement

                When referencing tweets, use their exact ID in the tweet_id field. The conversation should be engaging yet analytical. Limit the dialogue to ${
                    duration * 7
                } exchanges. Remember, the transcript must include 2-6 tweets if ${
                            relevantTweets.length
                        } > 0.

                Also, in the text, don't output prices exactly, if it is $153,243.43536 you would output 150 thousand dollars. or for 0.324522662 price, you would say 32 cents.

                The JSON format must be:
                {
                "transcript": [
                    {
                    "agentId": "exact value of either ${agentA} or ${agentB}",
                    "text": "their line of dialogue",
                    "tweet_id": "optional tweet ID if referencing a specific tweet"
                    }
                ]
                }`,
                    },
                    {
                        role: "user",
                        content: `Generate a dialogue about ${marketData.symbol} using the provided market data and community tweets. Make it engaging and insightful, incorporating actual tweet references when relevant.`,
                    },
                ],
                response_format: { type: "json_object" },
                model: "abab6.5s-chat",
                temperature: 0.5,
                max_tokens: 4096,
                top_p: 1,
                stop: null,
                stream: false,
            });

            console.log("✅ Chat completion received");
            content = completion.choices[0]?.message?.content || "";
            console.log("📄 Content length:", content.length);
        } catch (error) {
            console.error("❌ Error in generateTranscript:", error);
            throw error;
        }

        console.log("🔍 Parsing content...");
        const transcript = (
            content === "" ? null : JSON.parse(content)
        ) as null | { transcript: MemeCoinTranscript[] };

        if (transcript) {
            console.log("✅ Valid transcript generated");
            console.log("📜 Transcript lines:");
            transcript.transcript.forEach((entry, index) => {
                console.log(`${index + 1}. ${entry.agentId}: "${entry.text}"`);
                if (entry.tweet_id) {
                    const referencedTweet = relevantTweets.find(
                        (t: Tweet) => t.id_str === entry.tweet_id
                    );
                    if (referencedTweet) {
                        console.log(
                            `   📱 Referenced tweet: @${referencedTweet.user.screen_name}: ${referencedTweet.full_text}`
                        );
                    }
                }
            });

            // Add ticker and tradingViewSymbol to the return object
            return {
                ...transcript,
                ticker: validToken,
                tradingViewSymbol: marketData.symbol,
                currentPrice: marketData.price,
                marketCap: marketData.marketCap,
                percentageChange: marketData.change24h,
            };
        }
    }

    throw new Error("stop here");
}
