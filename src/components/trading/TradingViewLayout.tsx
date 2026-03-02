"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import ChartContainer, { type ChartContainerRef } from "@/components/trading/ChartContainer";
import LeftToolbar from "@/components/trading/LeftToolbar";
import { type DrawingToolType, type StoredDrawing } from "@/lib/drawing-tools-v2";
import {
  ChartBarIcon,
  DocumentTextIcon,
  NewspaperIcon,
  CreditCardIcon,
  Bars3Icon,
  PencilSquareIcon,
  BellIcon,
  ClipboardDocumentListIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  Cog6ToothIcon,
  ArrowRightIcon,
  MinusIcon,
  PlusIcon,
  XMarkIcon,
  Square2StackIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  StarIcon,
  EyeIcon,
  PlayIcon,
  StopIcon,
  ArrowsPointingOutIcon,
  InformationCircleIcon,
  UserIcon,
  ClockIcon,
  FireIcon,
  SparklesIcon,
  CursorArrowRaysIcon,
  Squares2X2Icon,
  RectangleStackIcon,
  ChartPieIcon,
  LightBulbIcon,
  QuestionMarkCircleIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";

// Types
type TradingMode = "paper" | "real";
type SidePanel = "watchlist" | "order" | "journal" | "news";
type TimeframeValue = "1" | "3" | "5" | "15" | "30" | "60" | "120" | "240" | "360" | "720" | "D" | "W";

type DrawingTool = DrawingToolType;
type Drawing = StoredDrawing;

// TradingView Colors
const TV = {
  bg: {
    primary: "#131722",
    secondary: "#1e222d",
    tertiary: "#2a2e39",
    hover: "#363a45",
    selected: "#2a2e39",
  },
  text: {
    primary: "#d1d4dc",
    secondary: "#787b86",
    tertiary: "#5d606b",
  },
  border: "#363a45",
  accent: {
    blue: "#2962ff",
    green: "#26a69a",
    red: "#ef5350",
    yellow: "#ff9800",
    purple: "#9c27b0",
  },
};

// Watchlist Data
const WATCHLIST_DATA = [
  { symbol: "BTCUSDT", name: "BTC/USDT", price: 65340.94, change: 2.34, favorite: true },
  { symbol: "ETHUSDT", name: "ETH/USDT", price: 3421.56, change: -0.87, favorite: true },
  { symbol: "BNBUSDT", name: "BNB/USDT", price: 587.23, change: 1.12, favorite: false },
  { symbol: "SOLUSDT", name: "SOL/USDT", price: 142.89, change: 5.67, favorite: true },
  { symbol: "XRPUSDT", name: "XRP/USDT", price: 0.5234, change: -1.23, favorite: false },
  { symbol: "ADAUSDT", name: "ADA/USDT", price: 0.4567, change: 0.45, favorite: false },
  { symbol: "DOGEUSDT", name: "DOGE/USDT", price: 0.1234, change: 3.21, favorite: false },
  { symbol: "MATICUSDT", name: "MATIC/USDT", price: 0.8765, change: -2.34, favorite: false },
  { symbol: "DOTUSDT", name: "DOT/USDT", price: 7.23, change: 1.56, favorite: false },
  { symbol: "AVAXUSDT", name: "AVAX/USDT", price: 35.67, change: 4.32, favorite: false },
];

// Chart Types
const CHART_TYPES = [
  { id: "candle", icon: ChartBarIcon, label: "Candles" },
  { id: "line", icon: ArrowTrendingUpIcon, label: "Line" },
  { id: "area", icon: RectangleStackIcon, label: "Area" },
  { id: "bar", icon: Squares2X2Icon, label: "Bars" },
];

// Symbol Search Component
function SymbolSearch({ onSelect, onClose }: { onSelect: (symbol: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const results = useMemo(() => {
    if (!query) return WATCHLIST_DATA;
    return WATCHLIST_DATA.filter(
      (item) =>
        item.symbol.toLowerCase().includes(query.toLowerCase()) ||
        item.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[100px] bg-black/50" onClick={onClose}>
      <div
        className="w-[600px] bg-[#1e222d] rounded-lg shadow-2xl border border-[#363a45] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#363a45]">
          <MagnifyingGlassIcon className="w-5 h-5 text-[#787b86]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbol..."
            className="flex-1 bg-transparent text-[#d1d4dc] text-lg outline-none placeholder:text-[#5d606b]"
          />
          <kbd className="px-2 py-1 text-xs text-[#787b86] bg-[#2a2e39] rounded">Esc</kbd>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {results.map((item) => (
            <button
              key={item.symbol}
              onClick={() => {
                onSelect(item.symbol);
                onClose();
              }}
              className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[#2a2e39] transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#2962ff]/20 flex items-center justify-center">
                <span className="text-[#2962ff] text-sm font-bold">{item.symbol[0]}</span>
              </div>
              <div className="flex-1 text-left">
                <div className="text-[#d1d4dc] font-medium">{item.name}</div>
                <div className="text-[#787b86] text-sm">{item.symbol}</div>
              </div>
              <div className="text-right">
                <div className="text-[#d1d4dc]">{item.price.toLocaleString()}</div>
                <div className={`text-sm ${item.change >= 0 ? "text-[#26a69a]" : "text-[#ef5350]"}`}>
                  {item.change >= 0 ? "+" : ""}{item.change}%
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Header Component
function Header({
  symbol,
  onSymbolClick,
  tradingMode,
  onTradingModeChange,
}: {
  symbol: string;
  onSymbolClick: () => void;
  tradingMode: TradingMode;
  onTradingModeChange: (mode: TradingMode) => void;
}) {
  return (
    <header className="h-[46px] flex items-center px-2 border-b border-[#363a45] bg-[#1e222d] gap-2">
      {/* Logo */}
      <div className="flex items-center gap-2 px-2">
        <div className="w-8 h-8 bg-gradient-to-br from-[#2962ff] to-[#1e54e6] rounded-lg flex items-center justify-center">
          <ChartBarIcon className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Symbol Selector */}
      <button
        onClick={onSymbolClick}
        className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-[#2a2e39] transition-colors group"
      >
        <StarSolidIcon className="w-4 h-4 text-[#ffeb3b]" />
        <span className="text-[#d1d4dc] font-bold text-sm">{symbol}</span>
        <ChevronDownIcon className="w-4 h-4 text-[#787b86] group-hover:text-[#d1d4dc]" />
      </button>

      {/* Trading Mode Toggle */}
      <div className="flex rounded overflow-hidden border border-[#363a45]">
        <button
          onClick={() => onTradingModeChange("paper")}
          className={`px-3 py-1 text-xs font-medium transition-colors ${
            tradingMode === "paper"
              ? "bg-[#26a69a] text-white"
              : "bg-[#1e222d] text-[#787b86] hover:text-[#d1d4dc]"
          }`}
        >
          Paper
        </button>
        <button
          onClick={() => onTradingModeChange("real")}
          className={`px-3 py-1 text-xs font-medium transition-colors ${
            tradingMode === "real"
              ? "bg-[#2962ff] text-white"
              : "bg-[#1e222d] text-[#787b86] hover:text-[#d1d4dc]"
          }`}
        >
          Real
        </button>
      </div>

      {/* Chart Type Selector */}
      <div className="flex items-center gap-1 ml-2">
        {CHART_TYPES.map((type) => (
          <button
            key={type.id}
            className={`p-1.5 rounded transition-colors ${
              type.id === "candle"
                ? "bg-[#2a2e39] text-[#d1d4dc]"
                : "text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]"
            }`}
            title={type.label}
          >
            <type.icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right Actions */}
      <div className="flex items-center gap-1">
        <button className="p-2 rounded text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] transition-colors">
          <BellIcon className="w-5 h-5" />
        </button>
        <button className="p-2 rounded text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] transition-colors">
          <UserIcon className="w-5 h-5" />
        </button>
        <button className="p-2 rounded text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] transition-colors">
          <Cog6ToothIcon className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}

// Top Toolbar Component
function TopToolbar({
  timeframe,
  onTimeframeChange,
  showOscillators,
  onToggleOscillators,
}: {
  timeframe: TimeframeValue;
  onTimeframeChange: (tf: TimeframeValue) => void;
  showOscillators: boolean;
  onToggleOscillators: () => void;
}) {
  const timeframes: { label: string; value: TimeframeValue }[] = [
    { label: "1", value: "1" },
    { label: "3", value: "3" },
    { label: "5", value: "5" },
    { label: "15", value: "15" },
    { label: "30", value: "30" },
    { label: "1H", value: "60" },
    { label: "2H", value: "120" },
    { label: "4H", value: "240" },
    { label: "6H", value: "360" },
    { label: "12H", value: "720" },
    { label: "D", value: "D" },
    { label: "W", value: "W" },
  ];

  return (
    <div className="h-[36px] flex items-center px-2 border-b border-[#363a45] bg-[#1e222d]">
      {/* Timeframe Buttons */}
      <div className="flex items-center gap-0.5">
        {timeframes.map((tf) => (
          <button
            key={tf.value}
            onClick={() => onTimeframeChange(tf.value)}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              timeframe === tf.value
                ? "bg-[#2962ff] text-white"
                : "text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]"
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-[#363a45] mx-2" />

      {/* Toolbar Actions */}
      <div className="flex items-center gap-1">
        <button className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] rounded transition-colors">
          <ChartBarIcon className="w-4 h-4" />
          <span className="hidden xl:inline">Indicators</span>
        </button>
        <button className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] rounded transition-colors">
          <PencilSquareIcon className="w-4 h-4" />
          <span className="hidden xl:inline">Draw</span>
        </button>
        <button className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] rounded transition-colors">
          <BellIcon className="w-4 h-4" />
          <span className="hidden xl:inline">Alert</span>
        </button>
        <button
          onClick={onToggleOscillators}
          className={`flex items-center gap-1.5 px-2 py-1.5 text-xs rounded transition-colors ${
            showOscillators
              ? "bg-[#2962ff]/20 text-[#2962ff]"
              : "text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]"
          }`}
        >
          <RectangleStackIcon className="w-4 h-4" />
          <span className="hidden xl:inline">Oscillators</span>
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right Actions */}
      <div className="flex items-center gap-1">
        <button className="p-1.5 rounded text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] transition-colors">
          <ArrowsPointingOutIcon className="w-4 h-4" />
        </button>
        <button className="p-1.5 rounded text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] transition-colors">
          <CameraIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Camera Icon
function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

// Watchlist Panel Component
function WatchlistPanel({ onSelectSymbol }: { onSelectSymbol: (symbol: string) => void }) {
  const [favorites, setFavorites] = useState<string[]>(WATCHLIST_DATA.filter((d) => d.favorite).map((d) => d.symbol));
  const [activeTab, setActiveTab] = useState<"favorites" | "all">("favorites");

  const toggleFavorite = (symbol: string) => {
    setFavorites((prev) => (prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]));
  };

  const displayData = activeTab === "favorites" ? WATCHLIST_DATA.filter((d) => favorites.includes(d.symbol)) : WATCHLIST_DATA;

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-[#363a45]">
        <button
          onClick={() => setActiveTab("favorites")}
          className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === "favorites"
              ? "text-[#2962ff] border-b-2 border-[#2962ff]"
              : "text-[#787b86] hover:text-[#d1d4dc]"
          }`}
        >
          <StarIcon className="w-4 h-4" />
          Favorites
        </button>
        <button
          onClick={() => setActiveTab("all")}
          className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === "all"
              ? "text-[#2962ff] border-b-2 border-[#2962ff]"
              : "text-[#787b86] hover:text-[#d1d4dc]"
          }`}
        >
          <Squares2X2Icon className="w-4 h-4" />
          All
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {displayData.map((item) => (
          <button
            key={item.symbol}
            onClick={() => onSelectSymbol(item.symbol)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#2a2e39] transition-colors group"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(item.symbol);
              }}
              className="text-[#787b86] hover:text-[#ffeb3b] transition-colors"
            >
              {favorites.includes(item.symbol) ? (
                <StarSolidIcon className="w-4 h-4 text-[#ffeb3b]" />
              ) : (
                <StarIcon className="w-4 h-4" />
              )}
            </button>
            <div className="flex-1 text-left">
              <div className="text-[#d1d4dc] text-sm font-medium">{item.name}</div>
              <div className="text-[#787b86] text-xs">Binance</div>
            </div>
            <div className="text-right">
              <div className="text-[#d1d4dc] text-sm">{item.price.toLocaleString()}</div>
              <div
                className={`text-xs ${item.change >= 0 ? "text-[#26a69a]" : "text-[#ef5350]"}`}
              >
                {item.change >= 0 ? "+" : ""}{item.change}%
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Order Panel Component
function OrderPanel() {
  const [orderType, setOrderType] = useState<"market" | "limit" | "stop">("market");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");

  return (
    <div className="p-3 flex flex-col h-full">
      {/* Order Type Tabs */}
      <div className="flex gap-1 mb-4">
        {(["market", "limit", "stop"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setOrderType(type)}
            className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
              orderType === type
                ? "bg-[#2a2e39] text-[#d1d4dc]"
                : "text-[#787b86] hover:text-[#d1d4dc]"
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Side Toggle */}
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setSide("buy")}
          className={`flex-1 py-2 text-sm font-bold rounded transition-colors ${
            side === "buy" ? "bg-[#26a69a] text-white" : "bg-[#2a2e39] text-[#787b86]"
          }`}
        >
          Buy / Long
        </button>
        <button
          onClick={() => setSide("sell")}
          className={`flex-1 py-2 text-sm font-bold rounded transition-colors ${
            side === "sell" ? "bg-[#ef5350] text-white" : "bg-[#2a2e39] text-[#787b86]"
          }`}
        >
          Sell / Short
        </button>
      </div>

      {/* Price Input (for limit/stop orders) */}
      {orderType !== "market" && (
        <div className="mb-3">
          <label className="text-[#787b86] text-xs mb-1 block">Price</label>
          <input
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            className="w-full bg-[#2a2e39] text-[#d1d4dc] text-sm px-3 py-2 rounded border border-[#363a45] focus:border-[#2962ff] outline-none transition-colors"
          />
        </div>
      )}

      {/* Amount Input */}
      <div className="mb-3">
        <label className="text-[#787b86] text-xs mb-1 block">Amount</label>
        <input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full bg-[#2a2e39] text-[#d1d4dc] text-sm px-3 py-2 rounded border border-[#363a45] focus:border-[#2962ff] outline-none transition-colors"
        />
      </div>

      {/* Quick Amount Buttons */}
      <div className="flex gap-1 mb-4">
        {[25, 50, 75, 100].map((pct) => (
          <button
            key={pct}
            className="flex-1 py-1 text-xs text-[#787b86] hover:text-[#d1d4dc] bg-[#2a2e39] rounded transition-colors"
          >
            {pct}%
          </button>
        ))}
      </div>

      {/* Submit Button */}
      <button
        className={`w-full py-3 text-sm font-bold rounded transition-colors ${
          side === "buy"
            ? "bg-[#26a69a] text-white hover:bg-[#1e8c7d]"
            : "bg-[#ef5350] text-white hover:bg-[#d64541]"
        }`}
      >
        {side === "buy" ? "Buy / Long" : "Sell / Short"}
      </button>

      {/* Balance Info */}
      <div className="mt-4 pt-4 border-t border-[#363a45]">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-[#787b86]">Available</span>
          <span className="text-[#d1d4dc]">10,000.00 USDT</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[#787b86]">Position</span>
          <span className="text-[#d1d4dc]">0 BTC</span>
        </div>
      </div>
    </div>
  );
}

// Journal Panel Component
function JournalPanel() {
  return (
    <div className="p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <DocumentTextIcon className="w-5 h-5 text-[#2962ff]" />
        <span className="text-[#d1d4dc] font-bold">Trading Journal</span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-[#2a2e39] p-3 rounded">
          <div className="text-[#787b86] text-xs mb-1">Total Trades</div>
          <div className="text-[#d1d4dc] text-xl font-bold">0</div>
        </div>
        <div className="bg-[#2a2e39] p-3 rounded">
          <div className="text-[#787b86] text-xs mb-1">Win Rate</div>
          <div className="text-[#d1d4dc] text-xl font-bold">0%</div>
        </div>
        <div className="bg-[#2a2e39] p-3 rounded">
          <div className="text-[#787b86] text-xs mb-1">Total PnL</div>
          <div className="text-[#26a69a] text-xl font-bold">$0</div>
        </div>
        <div className="bg-[#2a2e39] p-3 rounded">
          <div className="text-[#787b86] text-xs mb-1">Profit Factor</div>
          <div className="text-[#d1d4dc] text-xl font-bold">0.00</div>
        </div>
      </div>

      {/* Recent Trades */}
      <div className="flex-1">
        <div className="text-[#787b86] text-xs mb-2">Recent Trades</div>
        <div className="text-[#5d606b] text-sm text-center py-8">No trades yet</div>
      </div>
    </div>
  );
}

// News Panel Component
function NewsPanel() {
  return (
    <div className="p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <NewspaperIcon className="w-5 h-5 text-[#2962ff]" />
        <span className="text-[#d1d4dc] font-bold">Market News</span>
      </div>
      <div className="text-[#5d606b] text-sm text-center py-8">No news available</div>
    </div>
  );
}

// Bottom Toolbar Component
function BottomToolbar() {
  const [activeTab, setActiveTab] = useState<"orderbook" | "positions" | "orders" | "account">("orderbook");

  return (
    <div className="h-[32px] flex items-center px-2 border-t border-[#363a45] bg-[#1e222d]">
      <div className="flex items-center gap-0.5">
        {[
          { id: "orderbook", label: "Order Book", icon: Squares2X2Icon },
          { id: "positions", label: "Positions", icon: ChartBarIcon },
          { id: "orders", label: "Orders", icon: ClipboardDocumentListIcon },
          { id: "account", label: "Account", icon: CreditCardIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded transition-colors ${
              activeTab === tab.id
                ? "text-[#2962ff] bg-[#2962ff]/10"
                : "text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-4 text-xs text-[#787b86]">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-[#26a69a] rounded-full" />
          Connected
        </span>
      </div>
    </div>
  );
}

// Status Bar Component
function StatusBar({ tradingMode }: { tradingMode: TradingMode }) {
  return (
    <footer className="h-[28px] flex items-center px-3 border-t border-[#363a45] bg-[#1e222d] text-xs">
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-[#26a69a] rounded-full animate-pulse" />
          <span className="text-[#26a69a]">Connected</span>
        </span>
        <span className="text-[#363a45]">|</span>
        <span className="text-[#787b86]">Binance</span>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-medium ${
            tradingMode === "paper"
              ? "bg-[#26a69a]/20 text-[#26a69a]"
              : "bg-[#2962ff]/20 text-[#2962ff]"
          }`}
        >
          {tradingMode.toUpperCase()}
        </span>
        <span className="text-[#787b86]">Delay: 0ms</span>
        <span className="text-[#787b86]">BTC/USDT</span>
      </div>
    </footer>
  );
}

// Right Panel Component
function RightPanel({
  activePanel,
  onSelectSymbol,
}: {
  activePanel: SidePanel;
  onSelectSymbol: (symbol: string) => void;
}) {
  return (
    <div className="h-full flex flex-col">
      {/* Panel Tabs */}
      <div className="flex border-b border-[#363a45]">
        {[
          { id: "watchlist", label: "Watchlist", icon: EyeIcon },
          { id: "order", label: "Order", icon: CreditCardIcon },
          { id: "journal", label: "Journal", icon: DocumentTextIcon },
          { id: "news", label: "News", icon: NewspaperIcon },
        ].map((panel) => (
          <button
            key={panel.id}
            className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
              activePanel === panel.id
                ? "text-[#2962ff] border-b-2 border-[#2962ff]"
                : "text-[#787b86] hover:text-[#d1d4dc]"
            }`}
          >
            <panel.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{panel.label}</span>
          </button>
        ))}
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-hidden">
        {activePanel === "watchlist" && <WatchlistPanel onSelectSymbol={onSelectSymbol} />}
        {activePanel === "order" && <OrderPanel />}
        {activePanel === "journal" && <JournalPanel />}
        {activePanel === "news" && <NewsPanel />}
      </div>
    </div>
  );
}

// Main TradingView Layout Component
export default function TradingViewLayout() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [tradingMode, setTradingMode] = useState<TradingMode>("paper");
  const [timeframe, setTimeframe] = useState<TimeframeValue>("60");
  const [showOscillators, setShowOscillators] = useState(true);
  const [showSymbolSearch, setShowSymbolSearch] = useState(false);
  const [rightPanel, setRightPanel] = useState<SidePanel>("watchlist");
  const [rightPanelWidth, setRightPanelWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  
  // Drawing tools state
  const [drawingTool, setDrawingTool] = useState<DrawingTool>("cursor");
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const chartRef = useRef<ChartContainerRef>(null);

  const handleSelectSymbol = useCallback((newSymbol: string) => {
    setSymbol(newSymbol);
  }, []);
  
  const handleDrawingsChange = useCallback((newDrawings: Drawing[]) => {
    setDrawings(newDrawings);
  }, []);
  
  const handleClearDrawings = useCallback(() => {
    chartRef.current?.clearDrawings();
  }, []);

  const handleResize = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = window.innerWidth - e.clientX;
    setRightPanelWidth(Math.max(240, Math.min(400, newWidth)));
  }, [isResizing]);

  const stopResize = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleResize);
      document.addEventListener("mouseup", stopResize);
      return () => {
        document.removeEventListener("mousemove", handleResize);
        document.removeEventListener("mouseup", stopResize);
      };
    }
  }, [isResizing, handleResize, stopResize]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#131722] text-[#d1d4dc] overflow-hidden select-none">
      {/* Symbol Search Modal */}
      {showSymbolSearch && (
        <SymbolSearch
          onSelect={handleSelectSymbol}
          onClose={() => setShowSymbolSearch(false)}
        />
      )}

      {/* Header */}
      <Header
        symbol={symbol}
        onSymbolClick={() => setShowSymbolSearch(true)}
        tradingMode={tradingMode}
        onTradingModeChange={setTradingMode}
      />

      {/* Top Toolbar */}
      <TopToolbar
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        showOscillators={showOscillators}
        onToggleOscillators={() => setShowOscillators(!showOscillators)}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <LeftToolbar 
          activeTool={drawingTool}
          onToolChange={setDrawingTool}
          onClearDrawings={handleClearDrawings}
          drawingsCount={drawings.length}
        />

        {/* Chart Area */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 relative min-h-[200px]">
            <ChartContainer 
              ref={chartRef}
              showOscillators={showOscillators} 
              drawingTool={drawingTool}
              onDrawingsChange={handleDrawingsChange}
              symbol={symbol}
            />
          </div>
          {/* Bottom Toolbar */}
          <BottomToolbar />
        </main>

        {/* Resize Handle */}
        <div
          className="w-1 bg-[#363a45] hover:bg-[#2962ff] cursor-col-resize transition-colors"
          onMouseDown={() => setIsResizing(true)}
        />

        {/* Right Panel */}
        <aside
          className="border-l border-[#363a45] bg-[#1e222d] flex flex-col"
          style={{ width: rightPanelWidth }}
        >
          <RightPanel activePanel={rightPanel} onSelectSymbol={handleSelectSymbol} />
        </aside>
      </div>

      {/* Status Bar */}
      <StatusBar tradingMode={tradingMode} />
    </div>
  );
}
