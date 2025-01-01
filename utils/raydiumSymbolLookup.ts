import fetch from "node-fetch";

const TRADINGVIEW_SEARCH_URL =
    "https://symbol-search.tradingview.com/symbol_search/v3/?text=";

export async function searchTradingViewSymbols(
    ticker: string
): Promise<Pick<TradingViewSymbol, "symbol" | "description" | "type">[]> {
    console.log(`🔍 Searching TradingView symbols for ${ticker}`);

    const cleanTicker = ticker.replace("$", "").toUpperCase();

    try {
        const response = await fetch(
            `${TRADINGVIEW_SEARCH_URL}${cleanTicker}`,
            {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                    Accept: "*/*",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Accept-Encoding": "gzip, deflate, br",
                    Origin: "https://www.tradingview.com",
                    Referer: "https://www.tradingview.com/",
                    "Sec-Fetch-Dest": "empty",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Site": "same-site",
                    "Sec-Ch-Ua":
                        '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
                    "Sec-Ch-Ua-Mobile": "?0",
                    "Sec-Ch-Ua-Platform": '"Windows"',
                    Connection: "keep-alive",
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to search symbols: ${response.statusText}`);
        }

        const data = (await response.json()) as TradingViewResponse;
        console.log("Response data:", data);

        if (!data.symbols || !Array.isArray(data.symbols)) {
            throw new Error("Unexpected response format from TradingView API");
        }

        const matches = data.symbols.filter(
            (item) =>
                item.exchange === "Raydium Solana" &&
                (item.description.toUpperCase().includes(cleanTicker) ||
                    item.symbol.toUpperCase().includes(cleanTicker))
        );

        if (matches.length === 0) {
            const solResponse = await fetch(
                `${TRADINGVIEW_SEARCH_URL}${cleanTicker}SOL`,
                {
                    headers: {
                        "User-Agent":
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                        Accept: "*/*",
                        "Accept-Language": "en-US,en;q=0.9",
                        "Accept-Encoding": "gzip, deflate, br",
                        Origin: "https://www.tradingview.com",
                        Referer: "https://www.tradingview.com/",
                        "Sec-Fetch-Dest": "empty",
                        "Sec-Fetch-Mode": "cors",
                        "Sec-Fetch-Site": "same-site",
                        "Sec-Ch-Ua":
                            '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
                        "Sec-Ch-Ua-Mobile": "?0",
                        "Sec-Ch-Ua-Platform": '"Windows"',
                        Connection: "keep-alive",
                    },
                }
            );

            if (!solResponse.ok) {
                throw new Error(
                    `Failed to search symbols: ${solResponse.statusText}`
                );
            }

            const solData = (await solResponse.json()) as TradingViewResponse;
            console.log("Response data:", solData);

            if (!solData.symbols || !Array.isArray(solData.symbols)) {
                throw new Error();
            }

            const solMatches = solData.symbols.filter(
                (item) =>
                    item.exchange === "Raydium Solana" &&
                    (item.description.toUpperCase().includes(cleanTicker) ||
                        item.symbol.toUpperCase().includes(cleanTicker))
            );

            if (solMatches.length === 0) {
                throw new Error(`No TradingView symbols found for ${ticker}`);
            }

            return solMatches.map((match) => ({
                symbol: match.symbol,
                description: match.description,
                type: match.type,
            }));
        }

        return matches.map((match) => ({
            symbol: match.symbol,
            description: match.description,
            type: match.type,
        }));
    } catch (error) {
        console.error(
            `❌ Error searching TradingView symbols for ${ticker}:`,
            error
        );
        throw error;
    }
}

export async function getUSDTradingViewSymbol(
    ticker: string
): Promise<string | undefined> {
    const symbols = await searchTradingViewSymbols(ticker);
    return symbols.find((s) => s.symbol.endsWith(".USD"))?.symbol;
}

/**
 * Gets market data for a Raydium token
 * @param ticker - The ticker symbol (e.g., "FWOG")
 * @returns Market data including price, volume, and market cap
 */
export async function getTokenMarketData(ticker: string): Promise<MarketData> {
    try {
        const symbols = await searchTradingViewSymbols(ticker);
        const usdSymbol = symbols.find((s) =>
            s.symbol.endsWith(".USD")
        )?.symbol;

        if (!usdSymbol) {
            throw new Error(`No USD trading pair found for ${ticker}`);
        }

        const response = await fetch(
            `https://scanner.tradingview.com/crypto/scan`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                    Origin: "https://www.tradingview.com",
                    Referer: "https://www.tradingview.com/",
                },
                body: JSON.stringify({
                    symbols: {
                        tickers: [`RAYDIUM:${usdSymbol}`],
                        query: {
                            types: [],
                        },
                    },
                    columns: ["close", "volume", "market_cap_calc", "change"],
                }),
            }
        );

        const data = await response.json();
        console.log("Market data response:", data);

        if (!data.data || !data.data[0] || !data.data[0].d) {
            throw new Error(
                "Unexpected response format from TradingView scanner"
            );
        }

        const [price, volume, marketCap, change] = data.data[0].d;

        return {
            price: price || 0,
            volume: volume || 0,
            marketCap: marketCap || 0,
            change24h: change || 0,
            symbol: usdSymbol,
        };
    } catch (error) {
        console.error(`❌ Error getting market data for ${ticker}:`, error);
        throw error;
    }
}
