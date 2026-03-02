/**
 * Drawing Tools Configuration
 * Complete list of drawing tools organized by category, matching TradingView's toolbar
 */

import type { LucideIcon } from "lucide-react";
import {
  MousePointer2,
  Crosshair,
  CircleDot,
  ArrowRight,
  ArrowUpRight,
  Minus,
  Plus,
  Square,
  Circle,
  Triangle,
  // Fibonacci
  BarChart3,
  TrendingUp,
  // Measurements
  Tag,
  Ruler,
  // Text/Annotations
  Type,
  Pencil,
  // Patterns
  Hexagon,
  // Gann/Pitchfork
  GitBranch,
  // Misc
  Eraser,
  Lock,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";

// Alias for backward compatibility
const CursorArrow2Icon = MousePointer2;
const Crosshair1Icon = Crosshair;
const DotIcon = CircleDot;
const ArrowRightIcon = ArrowRight;
const ArrowUpRightIcon = ArrowUpRight;
const MinusIcon = Minus;
const PlusIcon = Plus;
const SquareIcon = Square;
const CircleIcon = Circle;
const TriangleIcon = Triangle;
const BarChart3Icon = BarChart3;
const TrendingUpIcon = TrendingUp;
const TagIcon = Tag;
const RulerIcon = Ruler;
const TypeIcon = Type;
const PencilIcon = Pencil;
const HexagonIcon = Hexagon;
const GitBranchIcon = GitBranch;
const EraserIcon = Eraser;
const LockIcon = Lock;
const EyeIcon = Eye;
const EyeOffIcon = EyeOff;
const TrashIcon = Trash2;

// Tool type definitions
export type DrawingToolType =
  // Cursors
  | "cursor"
  | "crosshair"
  | "dot"
  // Trend Lines
  | "trend_line"
  | "trend_line_arrow"
  | "ray"
  | "horizontal_line"
  | "vertical_line"
  | "parallel_channel"
  | "info_line"
  // Fibonacci
  | "fib_retracement"
  | "fib_extension"
  | "fib_speed_resistance_fan"
  | "fib_circles"
  | "fib_time_zones"
  | "fib_channel"
  // Gann
  | "gann_fan"
  | "gann_box"
  | "gann_square"
  // Geometric
  | "rectangle"
  | "circle"
  | "ellipse"
  | "triangle"
  | "polyline"
  // Measurements
  | "price_label"
  | "price_range"
  | "date_price_range"
  // Patterns
  | "abcd_pattern"
  | "head_shoulders"
  | "three_drives"
  // Pitchfork
  | "pitchfork"
  | "schiff_pitchfork"
  | "modified_schiff_pitchfork"
  | "inside_pitchfork"
  // Annotations
  | "text"
  | "brush"
  // Prediction
  | "time_cycles"
  | "regression_trend"
  | "diverging_channel";

// Tool category
export type ToolCategory =
  | "cursors"
  | "trend_lines"
  | "fibonacci"
  | "gann"
  | "geometric"
  | "measurements"
  | "patterns"
  | "pitchfork"
  | "annotations"
  | "prediction";

// Individual tool configuration
export interface ToolConfig {
  id: DrawingToolType;
  name: string;
  shortcut?: string;
  icon: LucideIcon;
  description: string;
  points: number; // Number of clicks needed
}

// Category configuration
export interface CategoryConfig {
  id: ToolCategory;
  name: string;
  icon: LucideIcon;
  tools: ToolConfig[];
}

// Complete tools configuration
export const DRAWING_TOOLS_CONFIG: CategoryConfig[] = [
  // Cursors
  {
    id: "cursors",
    name: "Cursors",
    icon: CursorArrow2Icon,
    tools: [
      {
        id: "cursor",
        name: "Cursor",
        shortcut: "",
        icon: CursorArrow2Icon,
        description: "Default cursor for selection and navigation",
        points: 0,
      },
      {
        id: "crosshair",
        name: "Crosshair",
        shortcut: "",
        icon: Crosshair1Icon,
        description: "Crosshair cursor for precise positioning",
        points: 0,
      },
      {
        id: "dot",
        name: "Dot",
        shortcut: "",
        icon: DotIcon,
        description: "Dot cursor for minimal visibility",
        points: 0,
      },
    ],
  },
  // Trend Lines
  {
    id: "trend_lines",
    name: "Trend Lines",
    icon: TrendingUpIcon,
    tools: [
      {
        id: "trend_line",
        name: "Trend Line",
        shortcut: "Alt+T",
        icon: MinusIcon,
        description: "Draw a trend line between two points",
        points: 2,
      },
      {
        id: "trend_line_arrow",
        name: "Arrow",
        shortcut: "",
        icon: ArrowRightIcon,
        description: "Trend line with arrow indicator",
        points: 2,
      },
      {
        id: "ray",
        name: "Ray",
        shortcut: "",
        icon: ArrowUpRightIcon,
        description: "Infinite ray from a point",
        points: 2,
      },
      {
        id: "horizontal_line",
        name: "Horizontal Line",
        shortcut: "Alt+H",
        icon: MinusIcon,
        description: "Horizontal price level line",
        points: 1,
      },
      {
        id: "vertical_line",
        name: "Vertical Line",
        shortcut: "Alt+V",
        icon: PlusIcon,
        description: "Vertical time line",
        points: 1,
      },
      {
        id: "parallel_channel",
        name: "Parallel Channel",
        shortcut: "",
        icon: SquareIcon,
        description: "Two parallel trend lines forming a channel",
        points: 3,
      },
      {
        id: "info_line",
        name: "Info Line",
        shortcut: "",
        icon: MinusIcon,
        description: "Trend line with price information",
        points: 2,
      },
    ],
  },
  // Fibonacci
  {
    id: "fibonacci",
    name: "Fibonacci",
    icon: BarChart3Icon,
    tools: [
      {
        id: "fib_retracement",
        name: "Fib Retracement",
        shortcut: "",
        icon: TrendingUpIcon,
        description: "Fibonacci retracement levels",
        points: 2,
      },
      {
        id: "fib_extension",
        name: "Fib Extension",
        shortcut: "",
        icon: TrendingUpIcon,
        description: "Fibonacci extension levels",
        points: 3,
      },
      {
        id: "fib_speed_resistance_fan",
        name: "Fib Fan",
        shortcut: "",
        icon: TrendingUpIcon,
        description: "Fibonacci speed resistance fan",
        points: 2,
      },
      {
        id: "fib_circles",
        name: "Fib Circles",
        shortcut: "",
        icon: CircleIcon,
        description: "Fibonacci arcs/circles",
        points: 2,
      },
      {
        id: "fib_time_zones",
        name: "Fib Time Zones",
        shortcut: "",
        icon: PlusIcon,
        description: "Fibonacci time zones",
        points: 2,
      },
      {
        id: "fib_channel",
        name: "Fib Channel",
        shortcut: "",
        icon: SquareIcon,
        description: "Fibonacci channel",
        points: 3,
      },
    ],
  },
  // Gann
  {
    id: "gann",
    name: "Gann",
    icon: HexagonIcon,
    tools: [
      {
        id: "gann_fan",
        name: "Gann Fan",
        shortcut: "",
        icon: TrendingUpIcon,
        description: "Gann fan angles",
        points: 2,
      },
      {
        id: "gann_box",
        name: "Gann Box",
        shortcut: "",
        icon: SquareIcon,
        description: "Gann box analysis tool",
        points: 2,
      },
      {
        id: "gann_square",
        name: "Gann Square",
        shortcut: "",
        icon: SquareIcon,
        description: "Gann square of 9",
        points: 2,
      },
    ],
  },
  // Geometric Shapes
  {
    id: "geometric",
    name: "Shapes",
    icon: SquareIcon,
    tools: [
      {
        id: "rectangle",
        name: "Rectangle",
        shortcut: "Alt+R",
        icon: SquareIcon,
        description: "Draw a rectangle",
        points: 2,
      },
      {
        id: "circle",
        name: "Circle",
        shortcut: "",
        icon: CircleIcon,
        description: "Draw a circle",
        points: 2,
      },
      {
        id: "ellipse",
        name: "Ellipse",
        shortcut: "",
        icon: CircleIcon,
        description: "Draw an ellipse",
        points: 2,
      },
      {
        id: "triangle",
        name: "Triangle",
        shortcut: "",
        icon: TriangleIcon,
        description: "Draw a triangle",
        points: 3,
      },
      {
        id: "polyline",
        name: "Polyline",
        shortcut: "",
        icon: TrendingUpIcon,
        description: "Draw connected line segments",
        points: -1, // Variable number of points
      },
    ],
  },
  // Measurements
  {
    id: "measurements",
    name: "Measure",
    icon: RulerIcon,
    tools: [
      {
        id: "price_label",
        name: "Price Label",
        shortcut: "",
        icon: TagIcon,
        description: "Add a price label",
        points: 1,
      },
      {
        id: "price_range",
        name: "Price Range",
        shortcut: "",
        icon: RulerIcon,
        description: "Measure price range",
        points: 2,
      },
      {
        id: "date_price_range",
        name: "Date & Price Range",
        shortcut: "",
        icon: RulerIcon,
        description: "Measure date and price range",
        points: 2,
      },
    ],
  },
  // Patterns
  {
    id: "patterns",
    name: "Patterns",
    icon: GitBranchIcon,
    tools: [
      {
        id: "abcd_pattern",
        name: "ABCD Pattern",
        shortcut: "",
        icon: TrendingUpIcon,
        description: "ABCD harmonic pattern",
        points: 4,
      },
      {
        id: "head_shoulders",
        name: "Head & Shoulders",
        shortcut: "",
        icon: TrendingUpIcon,
        description: "Head and shoulders pattern",
        points: 5,
      },
      {
        id: "three_drives",
        name: "Three Drives",
        shortcut: "",
        icon: TrendingUpIcon,
        description: "Three drives pattern",
        points: 6,
      },
    ],
  },
  // Pitchfork
  {
    id: "pitchfork",
    name: "Pitchfork",
    icon: GitBranchIcon,
    tools: [
      {
        id: "pitchfork",
        name: "Pitchfork",
        shortcut: "",
        icon: GitBranchIcon,
        description: "Andrews Pitchfork",
        points: 3,
      },
      {
        id: "schiff_pitchfork",
        name: "Schiff Pitchfork",
        shortcut: "",
        icon: GitBranchIcon,
        description: "Schiff Pitchfork variation",
        points: 3,
      },
      {
        id: "modified_schiff_pitchfork",
        name: "Modified Schiff",
        shortcut: "",
        icon: GitBranchIcon,
        description: "Modified Schiff Pitchfork",
        points: 3,
      },
      {
        id: "inside_pitchfork",
        name: "Inside Pitchfork",
        shortcut: "",
        icon: GitBranchIcon,
        description: "Inside Pitchfork variation",
        points: 3,
      },
    ],
  },
  // Annotations
  {
    id: "annotations",
    name: "Annotations",
    icon: TypeIcon,
    tools: [
      {
        id: "text",
        name: "Text",
        shortcut: "",
        icon: TypeIcon,
        description: "Add text annotation",
        points: 1,
      },
      {
        id: "brush",
        name: "Brush",
        shortcut: "",
        icon: PencilIcon,
        description: "Freehand brush drawing",
        points: -1,
      },
    ],
  },
  // Prediction
  {
    id: "prediction",
    name: "Prediction",
    icon: EyeIcon,
    tools: [
      {
        id: "time_cycles",
        name: "Time Cycles",
        shortcut: "",
        icon: PlusIcon,
        description: "Time cycle analysis",
        points: 2,
      },
      {
        id: "regression_trend",
        name: "Regression Trend",
        shortcut: "",
        icon: TrendingUpIcon,
        description: "Linear regression trend",
        points: 2,
      },
      {
        id: "diverging_channel",
        name: "Diverging Channel",
        shortcut: "",
        icon: SquareIcon,
        description: "Diverging channel pattern",
        points: 3,
      },
    ],
  },
];

// Helper to get all tools as flat array
export function getAllTools(): ToolConfig[] {
  return DRAWING_TOOLS_CONFIG.flatMap((cat) => cat.tools);
}

// Helper to get tool by ID
export function getToolById(id: DrawingToolType): ToolConfig | undefined {
  return getAllTools().find((tool) => tool.id === id);
}

// Helper to check if tool is a cursor (not a drawing tool)
export function isCursorTool(tool: DrawingToolType): boolean {
  return tool === "cursor" || tool === "crosshair" || tool === "dot";
}
