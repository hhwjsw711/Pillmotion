export async function getRecentTweets(
    query: string,
    limit: number,
    secrets: VideoSecrets
): Promise<Tweet[]> {
    const allTweets = [];
    let nextCursor = null;

    do {
        try {
            let endpoint = `https://api.socialdata.tools/twitter/search?query=${encodeURIComponent(
                query
            )}`;

            if (nextCursor) {
                endpoint += `&cursor=${nextCursor}`;
            }

            console.log(
                `🔄 Fetching tweets page${
                    nextCursor ? ` with cursor: ${nextCursor}` : ""
                }`
            );

            const response = await fetch(endpoint, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${secrets.SOCIAL_DATA_API_KEY}`,
                    Accept: "application/json",
                },
            });

            if (!response.ok) {
                throw new Error(
                    `Error fetching tweets: ${response.statusText}`
                );
            }

            const data = await response.json();

            if (!data.tweets || !Array.isArray(data.tweets)) {
                throw new Error("Invalid response format: no tweets array");
            }

            allTweets.push(...data.tweets);
            console.log(
                `📊 Fetched ${data.tweets.length} tweets (Total: ${allTweets.length})`
            );

            nextCursor = data.next_cursor;

            if (
                data.tweets.length === 0 ||
                !nextCursor ||
                allTweets.length >= limit
            ) {
                break;
            }

            await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
            console.error("❌ Error fetching tweets page:", error);
            break;
        }
    } while (true);

    console.log(`✅ Total tweets fetched: ${allTweets.length}`);
    return allTweets;
}
