import { useEffect, useRef, memo } from "react";

export type Timeframe = "1D" | "1M" | "6M" | "1Y" | "5Y";

function TradingViewWidget({
    timeframe,
    symbol = "RAYDIUM:FWOGSOL_AB1EU2.USD",
}: {
    timeframe: Timeframe;
    symbol?: string;
}) {
    const container = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const script = document.createElement("script");
        script.src =
            "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
        script.type = "text/javascript";
        script.async = true;
        script.innerHTML = `
        {
          "symbols": [
            [
              "${symbol}|${timeframe}"
            ]
          ],
          "chartOnly": false,
          "width": "100%",
          "height": "100%",
          "locale": "en",
          "colorTheme": "dark",
          "autosize": true,
          "showVolume": true,
          "showMA": false,
          "hideDateRanges": false,
          "hideMarketStatus": true,
          "hideSymbolLogo": false,
          "scalePosition": "right",
          "scaleMode": "Normal",
          "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
          "fontSize": "32",
          "noTimeScale": false,
          "valuesTracking": "1",
          "changeMode": "price-and-percent",
          "chartType": "candlesticks",
          "headerFontSize": "large",
          "lineType": 0,
          "dateRanges": [
            "1d|15",
            "1m|240",
            "6m|1D",
            "12m|1D",
            "60m|1W",
            "all|1M"
          ],
          "timeHoursFormat": "12-hours",
          "upColor": "#22ab94",
          "downColor": "#f7525f",
          "borderUpColor": "#22ab94",
          "borderDownColor": "#f7525f",
          "wickUpColor": "#22ab94",
          "wickDownColor": "#f7525f"
        }`;
        container.current?.appendChild(script);

        // Cleanup previous script when timeframe changes
        return () => {
            if (container.current) {
                container.current.innerHTML = "";
            }
        };
    }, [timeframe]);

    return (
        <div className="tradingview-widget-container" ref={container}>
            <div className="tradingview-widget-container__widget"></div>
            <div className="tradingview-widget-copyright">
                <a
                    href="https://www.tradingview.com/"
                    rel="noopener nofollow"
                    target="_blank"
                >
                    <span className="blue-text">
                        Track all markets on TradingView
                    </span>
                </a>
            </div>
        </div>
    );
}

export default memo(TradingViewWidget);
