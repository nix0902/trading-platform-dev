"use client";

import { create } from "zustand";

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartStore {
  chartData: Candle[];
  mainChart: unknown;
  symbol: string;
  interval: string;
  setChartData: (data: Candle[]) => void;
  setMainChart: (chart: unknown) => void;
  setSymbol: (symbol: string) => void;
  setInterval: (interval: string) => void;
}

export const useChartStore = create<ChartStore>((set) => ({
  chartData: [],
  mainChart: null,
  symbol: "BTCUSDT",
  interval: "1h",
  setChartData: (data) => set({ chartData: data }),
  setMainChart: (chart) => set({ mainChart: chart }),
  setSymbol: (symbol) => set({ symbol }),
  setInterval: (interval) => set({ interval }),
}));
