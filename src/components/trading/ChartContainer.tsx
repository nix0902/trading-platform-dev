"use client";

import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { 
  createChart, 
  ColorType,
  LineSeries,
  CandlestickSeries,
  HistogramSeries,
} from "lightweight-charts";
import type { IChartApi, ISeriesApi, Time, CandlestickData, LineData, HistogramData } from "lightweight-charts";
import {
  BinanceCombinedProvider,
  type Candle,
  type KlineInterval,
  type ConnectionMethod,
} from "@/lib/binance";
import { DrawingManager, type StoredDrawing, type DrawingToolType } from "@/lib/drawing-tools-v2/manager";

type DrawingTool = DrawingToolType;
type Drawing = StoredDrawing;

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
  { label: "12h", value: "12h" },
  { label: "1D", value: "1d" },
  { label: "1W", value: "1w" },
];

// RSI Calculation
function calculateRSI(candles: Candle[], period: number = 14): (LineData<Time> | null)[] {
  if (candles.length < period + 1) return [];

  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  let avgGain = gains.reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.reduce((a, b) => a + b, 0) / period;

  const rsiData: (LineData<Time> | null)[] = [];

  for (let i = period; i < candles.length; i++) {
    if (i > period) {
      const change = candles[i].close - candles[i - 1].close;
      const currentGain = change > 0 ? change : 0;
      const currentLoss = change < 0 ? Math.abs(change) : 0;

      avgGain = (avgGain * (period - 1) + currentGain) / period;
      avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
    }

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    rsiData.push({
      time: candles[i].time as Time,
      value: rsi,
    });
  }

  return rsiData;
}

// MACD Calculation
function calculateMACD(candles: Candle[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
  if (candles.length < slowPeriod) return { macd: [], signal: [], histogram: [] };

  function calculateEMA(data: number[], period: number): number[] {
    const multiplier = 2 / (period + 1);
    const ema: number[] = [];

    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += data[i];
    }
    ema[period - 1] = sum / period;

    for (let i = period; i < data.length; i++) {
      ema[i] = (data[i] - ema[i - 1]) * multiplier + ema[i - 1];
    }

    return ema;
  }

  const closes = candles.map(c => c.close);
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);

  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (fastEMA[i] !== undefined && slowEMA[i] !== undefined) {
      macdLine[i] = fastEMA[i] - slowEMA[i];
    }
  }

  const validMacd = macdLine.filter(v => v !== undefined);
  const signalLine = calculateEMA(validMacd, signalPeriod);

  const signalMap: number[] = [];
  let validIndex = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] !== undefined) {
      signalMap[i] = signalLine[validIndex];
      validIndex++;
    }
  }

  const macd: LineData<Time>[] = [];
  const signal: LineData<Time>[] = [];
  const histogram: HistogramData<Time>[] = [];

  const startIndex = slowPeriod + signalPeriod - 2;

  for (let i = startIndex; i < candles.length; i++) {
    if (macdLine[i] !== undefined && signalMap[i] !== undefined) {
      macd.push({
        time: candles[i].time as Time,
        value: macdLine[i],
      });
      signal.push({
        time: candles[i].time as Time,
        value: signalMap[i],
      });
      const histValue = macdLine[i] - signalMap[i];
      histogram.push({
        time: candles[i].time as Time,
        value: histValue,
        color: histValue >= 0 ? "#26a69a" : "#ef5350",
      });
    }
  }

  return { macd, signal, histogram };
}

// Export chart API for drawing tools
export interface ChartContainerRef {
  getChart: () => IChartApi | null;
  getContainer: () => HTMLDivElement | null;
  setDrawingTool: (tool: DrawingTool) => void;
  clearDrawings: () => void;
  getDrawings: () => Drawing[];
}

interface ChartContainerProps {
  showOscillators: boolean;
  drawingTool?: DrawingTool;
  onDrawingsChange?: (drawings: Drawing[]) => void;
  symbol?: string;
  onSymbolChange?: (symbol: string) => void;
}

/**
 * ChartContainer using lightweight-charts v5 Panes API
 */
const ChartContainer = forwardRef<ChartContainerRef, ChartContainerProps>(
  function ChartContainer({ 
    showOscillators, 
    drawingTool = "cursor",
    onDrawingsChange,
    symbol = "BTCUSDT",
    onSymbolChange,
  }, ref) {
    // DOM refs
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const drawingManagerRef = useRef<DrawingManager | null>(null);
    
    // Series refs
    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const macdSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const signalSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const histogramSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
    const overboughtLineRef = useRef<ISeriesApi<"Line"> | null>(null);
    const oversoldLineRef = useRef<ISeriesApi<"Line"> | null>(null);

    // State refs
    const providerRef = useRef<BinanceCombinedProvider | null>(null);
    const priceRef = useRef(0);
    const chartInitialized = useRef(false);
    const candlesRef = useRef<Candle[]>([]);
    const oscillatorsAdded = useRef(false);
    const symbolRef = useRef(symbol);
    
    // Stable callback ref
    const onDrawingsChangeRef = useRef(onDrawingsChange);
    onDrawingsChangeRef.current = onDrawingsChange;

    const [price, setPrice] = useState(0);
    const [prevPrice, setPrevPrice] = useState(0);
    const [status, setStatus] = useState<"loading" | "connected" | "error">("loading");
    const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod>("hybrid");
    const [updates, setUpdates] = useState(0);
    const [currentInterval, setCurrentInterval] = useState<KlineInterval>("1h");

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      getChart: () => chartRef.current,
      getContainer: () => containerRef.current,
      setDrawingTool: (tool: DrawingTool) => {
        drawingManagerRef.current?.setActiveTool(tool);
      },
      clearDrawings: () => {
        drawingManagerRef.current?.clearAllDrawings();
      },
      getDrawings: () => {
        return drawingManagerRef.current?.getDrawings() || [];
      },
    }), []);

    /**
     * Update oscillators with candle data
     */
    const updateOscillatorsWithData = useCallback((candles: Candle[]) => {
      if (rsiSeriesRef.current) {
        const rsiData = calculateRSI(candles);
        const validData = rsiData.filter((d): d is LineData<Time> => d !== null);
        rsiSeriesRef.current.setData(validData);
      }

      if (macdSeriesRef.current && signalSeriesRef.current && histogramSeriesRef.current) {
        const { macd, signal, histogram } = calculateMACD(candles);
        macdSeriesRef.current.setData(macd);
        signalSeriesRef.current.setData(signal);
        histogramSeriesRef.current.setData(histogram);
      }
    }, []);

    /**
     * Add oscillator panes using v5 paneIndex API
     */
    const addOscillatorPanes = useCallback(() => {
      if (!chartRef.current || oscillatorsAdded.current) return;

      const chart = chartRef.current;

      try {
        // RSI Pane (paneIndex 1)
        const rsiSeries = chart.addSeries(LineSeries, {
          color: "#2962ff",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        }, 1);
        rsiSeriesRef.current = rsiSeries;

        // Add overbought/oversold lines to RSI pane
        const overboughtLine = chart.addSeries(LineSeries, {
          color: "#ef5350",
          lineWidth: 1,
          lineStyle: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        }, 1);
        overboughtLine.setData([{ time: 0 as Time, value: 70 }] as unknown as LineData<Time>[]);
        overboughtLineRef.current = overboughtLine;

        const oversoldLine = chart.addSeries(LineSeries, {
          color: "#26a69a",
          lineWidth: 1,
          lineStyle: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        }, 1);
        oversoldLine.setData([{ time: 0 as Time, value: 30 }] as unknown as LineData<Time>[]);
        oversoldLineRef.current = oversoldLine;

        // Set RSI pane height
        const rsiPane = chart.panes()[1];
        if (rsiPane) {
          rsiPane.setHeight(100);
        }

        // MACD Pane (paneIndex 2)
        const histogramSeries = chart.addSeries(HistogramSeries, {
          priceLineVisible: false,
          lastValueVisible: false,
        }, 2);
        histogramSeriesRef.current = histogramSeries;

        const macdSeries = chart.addSeries(LineSeries, {
          color: "#2962ff",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        }, 2);
        macdSeriesRef.current = macdSeries;

        const signalSeries = chart.addSeries(LineSeries, {
          color: "#ff9800",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        }, 2);
        signalSeriesRef.current = signalSeries;

        // Set MACD pane height
        const macdPane = chart.panes()[2];
        if (macdPane) {
          macdPane.setHeight(120);
        }

        oscillatorsAdded.current = true;

        // Update with existing data
        if (candlesRef.current.length > 0) {
          updateOscillatorsWithData(candlesRef.current);
        }
      } catch (error) {
        console.error("Error adding oscillator panes:", error);
      }
    }, [updateOscillatorsWithData]);

    /**
     * Remove oscillator panes
     */
    const removeOscillatorPanes = useCallback(() => {
      if (!chartRef.current || !oscillatorsAdded.current) return;

      const chart = chartRef.current;

      try {
        // Remove panes by index (remove from highest to lowest to avoid index shifting)
        if (chart.panes().length > 2) {
          chart.removePane(2);
        }
        if (chart.panes().length > 1) {
          chart.removePane(1);
        }
      } catch {
        // Pane may not exist
      }

      rsiSeriesRef.current = null;
      macdSeriesRef.current = null;
      signalSeriesRef.current = null;
      histogramSeriesRef.current = null;
      overboughtLineRef.current = null;
      oversoldLineRef.current = null;
      oscillatorsAdded.current = false;
    }, []);

    /**
     * Start data provider
     */
    const startProvider = useCallback(async (sym: string, interval: KlineInterval) => {
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }

      setStatus("loading");
      setUpdates(0);

      const provider = new BinanceCombinedProvider({
        symbol: sym,
        interval,
        historicalLimit: 500,
        onData: (candles: Candle[], newCandle: Candle | null) => {
          candlesRef.current = candles;

          if (candleSeriesRef.current) {
            candleSeriesRef.current.setData(candles as unknown as CandlestickData<Time>[]);
          }

          if (oscillatorsAdded.current) {
            updateOscillatorsWithData(candles);
          }

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
    }, [updateOscillatorsWithData]);

    /**
     * Handle timeframe change
     */
    const handleTimeframeChange = useCallback((tf: KlineInterval) => {
      setCurrentInterval(tf);
      setUpdates(0);
      startProvider(symbolRef.current, tf);
    }, [startProvider]);

    // Initialize chart on mount - runs ONCE
    useEffect(() => {
      if (!containerRef.current || chartInitialized.current) return;

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
          visible: true,
        },
        rightPriceScale: { borderColor: "#242832" },
      });

      chartRef.current = chart;
      chartInitialized.current = true;

      // Add candlestick series to default pane
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#26a69a",
        downColor: "#ef5350",
        borderDownColor: "#ef5350",
        borderUpColor: "#26a69a",
        wickDownColor: "#ef5350",
        wickUpColor: "#26a69a",
      });

      candleSeriesRef.current = candleSeries;

      // Initialize Drawing Manager with chart and series
      drawingManagerRef.current = new DrawingManager(
        chart,
        candleSeries,
        {},
        (drawings) => onDrawingsChangeRef.current?.(drawings)
      );

      // Add oscillator panes if enabled
      if (showOscillators) {
        setTimeout(() => {
          addOscillatorPanes();
        }, 50);
      }

      const onResize = () => {
        if (containerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          });
        }
      };

      window.addEventListener("resize", onResize);

      // Start data provider
      setTimeout(() => {
        startProvider(symbolRef.current, "1h");
      }, 100);

      return () => {
        window.removeEventListener("resize", onResize);
        if (providerRef.current) {
          providerRef.current.destroy();
        }
        if (drawingManagerRef.current) {
          drawingManagerRef.current.destroy();
        }
        if (chartRef.current) {
          chartRef.current.remove();
          chartInitialized.current = false;
        }
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps - runs once on mount

    // Update drawing tool when prop changes
    useEffect(() => {
      if (drawingManagerRef.current) {
        drawingManagerRef.current.setActiveTool(drawingTool);
      }
    }, [drawingTool]);

    // Handle oscillator visibility changes
    useEffect(() => {
      if (!chartRef.current || !chartInitialized.current) return;

      if (showOscillators && !oscillatorsAdded.current) {
        addOscillatorPanes();
      } else if (!showOscillators && oscillatorsAdded.current) {
        removeOscillatorPanes();
      }
    }, [showOscillators, addOscillatorPanes, removeOscillatorPanes]);

    // Handle symbol change
    useEffect(() => {
      if (symbol !== symbolRef.current && chartInitialized.current) {
        symbolRef.current = symbol;
        const timer = setTimeout(() => {
          startProvider(symbol, currentInterval);
        }, 0);
        return () => clearTimeout(timer);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [symbol, currentInterval]);

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
                currentInterval === tf.value
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
          <div className="text-[10px] text-[#787b86]">{symbol}</div>
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

        {/* Drawing Tool Indicator */}
        {drawingTool !== "cursor" && drawingTool !== "crosshair" && (
          <div className="absolute bottom-4 left-4 z-20 bg-[#2962ff]/90 px-3 py-1.5 rounded-lg">
            <span className="text-xs text-white font-medium">
              Drawing: {drawingTool.replace("_", " ").toUpperCase()}
            </span>
          </div>
        )}

        {/* Chart Container */}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    );
  }
);

export default ChartContainer;
