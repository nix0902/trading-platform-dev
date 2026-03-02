"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createChart, ColorType } from "lightweight-charts";
import type { IChartApi, ISeriesApi, Time, LineData, HistogramData } from "lightweight-charts";
import {
  BinanceCombinedProvider,
  type Candle,
  type KlineInterval,
} from "@/lib/binance";

interface OscillatorPanelProps {
  interval: KlineInterval;
  onIntervalChange?: (interval: KlineInterval) => void;
}

// RSI Calculation
function calculateRSI(candles: Candle[], period: number = 14): (LineData<Time> | null)[] {
  if (candles.length < period + 1) return [];

  const gains: number[] = [];
  const losses: number[] = [];

  // Calculate initial gains and losses
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

  // EMA calculation
  function calculateEMA(data: number[], period: number): number[] {
    const multiplier = 2 / (period + 1);
    const ema: number[] = [];

    // Start with SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += data[i];
    }
    ema[period - 1] = sum / period;

    // Calculate EMA
    for (let i = period; i < data.length; i++) {
      ema[i] = (data[i] - ema[i - 1]) * multiplier + ema[i - 1];
    }

    return ema;
  }

  const closes = candles.map(c => c.close);
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);

  // MACD Line
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (fastEMA[i] !== undefined && slowEMA[i] !== undefined) {
      macdLine[i] = fastEMA[i] - slowEMA[i];
    }
  }

  // Signal Line
  const validMacd = macdLine.filter(v => v !== undefined);
  const signalLine = calculateEMA(validMacd, signalPeriod);

  // Map signal line back to original indices
  const signalMap: number[] = [];
  let validIndex = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] !== undefined) {
      signalMap[i] = signalLine[validIndex];
      validIndex++;
    }
  }

  // Build result arrays
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

// RSI Chart Component
function RSIChart({ candles, height }: { candles: Candle[]; height: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  useEffect(() => {
    if (!containerRef.current || chartRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: height,
      layout: {
        background: { type: ColorType.Solid, color: "#131722" },
        textColor: "#787b86",
      },
      grid: {
        vertLines: { color: "#1f2943" },
        horzLines: { color: "#1f2943" },
      },
      rightPriceScale: {
        borderColor: "#242832",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: "#242832",
        visible: false,
      },
      crosshair: { mode: 1 },
    });

    // Add overbought/oversold lines
    const overboughtLine = chart.addLineSeries({
      color: "#ef5350",
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    overboughtLine.setData([
      { time: 0 as Time, value: 70 },
    ] as unknown as LineData<Time>[]);

    const oversoldLine = chart.addLineSeries({
      color: "#26a69a",
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    oversoldLine.setData([
      { time: 0 as Time, value: 30 },
    ] as unknown as LineData<Time>[]);

    const series = chart.addLineSeries({
      color: "#2962ff",
      lineWidth: 2,
      priceLineVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // Handle resize
    const onResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [height]);

  useEffect(() => {
    if (seriesRef.current && candles.length > 0) {
      const rsiData = calculateRSI(candles);
      const validData = rsiData.filter((d): d is LineData<Time> => d !== null);
      seriesRef.current.setData(validData);
    }
  }, [candles]);

  return (
    <div className="relative">
      <div className="absolute top-1 left-2 z-10 text-[10px] text-[#787b86]">
        RSI (14)
      </div>
      <div ref={containerRef} className="w-full" style={{ height }} />
    </div>
  );
}

// MACD Chart Component
function MACDChart({ candles, height }: { candles: Candle[]; height: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const macdSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const signalSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const histogramSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  useEffect(() => {
    if (!containerRef.current || chartRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: height,
      layout: {
        background: { type: ColorType.Solid, color: "#131722" },
        textColor: "#787b86",
      },
      grid: {
        vertLines: { color: "#1f2943" },
        horzLines: { color: "#1f2943" },
      },
      rightPriceScale: {
        borderColor: "#242832",
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: "#242832",
        visible: true,
      },
      crosshair: { mode: 1 },
    });

    const histogramSeries = chart.addHistogramSeries({
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const macdSeries = chart.addLineSeries({
      color: "#2962ff",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const signalSeries = chart.addLineSeries({
      color: "#ff9800",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chartRef.current = chart;
    macdSeriesRef.current = macdSeries;
    signalSeriesRef.current = signalSeries;
    histogramSeriesRef.current = histogramSeries;

    // Handle resize
    const onResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [height]);

  useEffect(() => {
    if (macdSeriesRef.current && signalSeriesRef.current && histogramSeriesRef.current && candles.length > 0) {
      const { macd, signal, histogram } = calculateMACD(candles);
      macdSeriesRef.current.setData(macd);
      signalSeriesRef.current.setData(signal);
      histogramSeriesRef.current.setData(histogram);
    }
  }, [candles]);

  return (
    <div className="relative">
      <div className="absolute top-1 left-2 z-10 text-[10px] text-[#787b86]">
        MACD (12, 26, 9)
      </div>
      <div ref={containerRef} className="w-full" style={{ height }} />
    </div>
  );
}

export default function OscillatorPanel({ interval }: OscillatorPanelProps) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const providerRef = useRef<BinanceCombinedProvider | null>(null);

  const startProvider = useCallback(async (symbol: string, tf: KlineInterval) => {
    if (providerRef.current) {
      providerRef.current.destroy();
      providerRef.current = null;
    }

    const provider = new BinanceCombinedProvider({
      symbol,
      interval: tf,
      historicalLimit: 500,
      onData: (data: Candle[]) => {
        setCandles(data);
      },
      onError: (error: Error) => {
        console.error("Oscillator provider error:", error);
      },
    });

    providerRef.current = provider;
    await provider.start();
  }, []);

  useEffect(() => {
    startProvider("BTCUSDT", interval);

    return () => {
      if (providerRef.current) {
        providerRef.current.destroy();
      }
    };
  }, [interval, startProvider]);

  return (
    <div className="w-full h-full flex flex-col bg-[#131722] border-t border-[#242832]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#1e222d] border-b border-[#242832]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#d1d4dc] font-medium">Oscillators</span>
          <span className="text-[10px] text-[#787b86]">RSI & MACD</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-[10px] px-2 py-1 bg-[#2a2e39] text-[#787b86] rounded hover:text-[#d1d4dc]">
            + Add
          </button>
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <RSIChart candles={candles} height={100} />
        <div className="h-px bg-[#242832]" />
        <MACDChart candles={candles} height={120} />
      </div>
    </div>
  );
}
