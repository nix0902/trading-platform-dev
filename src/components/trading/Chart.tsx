"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createChart, ColorType } from "lightweight-charts";
import type { IChartApi, ISeriesApi, Time, CandlestickData } from "lightweight-charts";
import { 
  BinanceCombinedProvider, 
  type Candle, 
  type KlineInterval,
  type ConnectionMethod 
} from "@/lib/binance";

const TIMEFRAMES: { label: string; value: KlineInterval }[] = [
  { label: "1m", value: "1m" },
  { label: "3m", value: "3m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "30m", value: "30m" },
  { label: "1h", value: "1h" },
  { label: "2h", value: "2h" },
  { label: "4h", value: "4h" },
  { label: "6h", value: "6h" },
  { label: "12m", value: "12h" },
  { label: "1D", value: "1d" },
  { label: "1W", value: "1w" },
];

interface ChartProps {
  interval: KlineInterval;
  onIntervalChange: (interval: KlineInterval) => void;
  onCandlesUpdate?: (candles: Candle[]) => void;
}

export default function Chart({ interval, onIntervalChange, onCandlesUpdate }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const providerRef = useRef<BinanceCombinedProvider | null>(null);
  const priceRef = useRef(0);
  const isInitializedRef = useRef(false);

  const [price, setPrice] = useState(0);
  const [prevPrice, setPrevPrice] = useState(0);
  const [status, setStatus] = useState<"loading" | "connected" | "error">("loading");
  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod>("hybrid");
  const [updates, setUpdates] = useState(0);

  /**
   * Инициализация графика
   */
  const initChart = useCallback(() => {
    if (!containerRef.current || chartRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: "#131722" },
        textColor: "#d1d4dc",
      },
      grid: {
        vertLines: { color: "#1f2943" },
        horzLines: { color: "#1f2943" },
      },
      crosshair: { mode: 1 },
      timeScale: {
        borderColor: "#242832",
        timeVisible: true,
        secondsVisible: false,
        visible: false, // Hide time scale on main chart, show on oscillator panel
      },
      rightPriceScale: { borderColor: "#242832" },
    });

    chartRef.current = chart;

    const series = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderDownColor: "#ef5350",
      borderUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      wickUpColor: "#26a69a",
    });

    seriesRef.current = series;
  }, []);

  /**
   * Запуск провайдера данных
   */
  const startProvider = useCallback(async (symbol: string, tf: KlineInterval) => {
    // Останавливаем предыдущий провайдер
    if (providerRef.current) {
      providerRef.current.destroy();
      providerRef.current = null;
    }

    setStatus("loading");
    setUpdates(0);

    // Создаём новый провайдер
    const provider = new BinanceCombinedProvider({
      symbol,
      interval: tf,
      historicalLimit: 500,
      onData: (candles: Candle[], newCandle: Candle | null) => {
        // Обновляем график
        if (seriesRef.current) {
          seriesRef.current.setData(candles as unknown as CandlestickData<Time>[]);
        }

        // Передаём свечи в родительский компонент для осцилляторов
        if (onCandlesUpdate) {
          onCandlesUpdate(candles);
        }

        // Обновляем цену
        if (newCandle) {
          setPrevPrice(priceRef.current);
          priceRef.current = newCandle.close;
          setPrice(newCandle.close);
          setUpdates((u) => u + 1);
        } else if (candles.length > 0) {
          const lastCandle = candles[candles.length - 1];
          priceRef.current = lastCandle.close;
          setPrice(lastCandle.close);
          setPrevPrice(lastCandle.close);
        }

        setStatus("connected");
        setConnectionMethod(provider.getMethod());
      },
      onError: (error: Error) => {
        console.error("Provider error:", error);
        setStatus("error");
      },
    });

    providerRef.current = provider;
    await provider.start();
  }, [onCandlesUpdate]);

  /**
   * Изменение таймфрейма
   */
  const handleTimeframeChange = useCallback((tf: KlineInterval) => {
    onIntervalChange(tf);
    setUpdates(0);
    startProvider("BTCUSDT", tf);
  }, [onIntervalChange, startProvider]);

  /**
   * Инициализация (один раз)
   */
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    initChart();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startProvider("BTCUSDT", interval);

    // Resize handler
    const onResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (providerRef.current) {
        providerRef.current.destroy();
      }
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [initChart, startProvider, interval]);

  const priceChange = price - prevPrice;
  const priceColor = priceChange >= 0 ? "#26a69a" : "#ef5350";

  return (
    <div className="relative w-full h-full">
      {/* Timeframe Selector */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-1 bg-[#1e222d]/95 px-2 py-1.5 rounded-lg">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.value}
            onClick={() => handleTimeframeChange(tf.value)}
            className={
              interval === tf.value
                ? "bg-[#2962ff] text-white px-2 py-1 text-xs rounded"
                : "text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] px-2 py-1 text-xs rounded"
            }
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Price Display */}
      <div className="absolute top-4 right-[80px] z-20 bg-[#1e222d]/95 px-3 py-2 rounded-lg min-w-[180px]">
        <div className="flex items-center gap-2 mb-1">
          <div
            className={
              status === "connected"
                ? "w-2 h-2 rounded-full bg-[#26a69a] animate-pulse"
                : status === "loading"
                ? "w-2 h-2 rounded-full bg-[#ff9800]"
                : "w-2 h-2 rounded-full bg-[#ef5350]"
            }
          />
          <span className="text-xs text-[#787b86]">
            {status === "connected" ? "LIVE" : status === "loading" ? "Loading..." : "Error"}
          </span>
        </div>
        <div className="text-[10px] text-[#787b86]">BTC/USDT</div>
        <div className="text-lg font-bold transition-colors duration-200" style={{ color: priceColor }}>
          ${price > 0 ? price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "---"}
        </div>
        <div className="text-xs" style={{ color: priceColor }}>
          {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}
        </div>
        <div className="text-[9px] text-[#787b86] mt-1">
          Updates: {updates} | {connectionMethod.toUpperCase()}
        </div>
      </div>

      {/* Chart Container */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
