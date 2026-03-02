"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  Trash2Icon,
  LockOpenIcon,
} from "lucide-react";
import {
  DRAWING_TOOLS_CONFIG,
  type DrawingToolType,
  type ToolCategory,
  type ToolConfig,
  type CategoryConfig,
} from "@/lib/drawing-tools-v2/tools-config";

type DrawingTool = DrawingToolType;

interface LeftToolbarProps {
  activeTool: DrawingToolType;
  onToolChange: (tool: DrawingToolType) => void;
  onClearDrawings: () => void;
  drawingsCount?: number;
}

// TradingView dark theme colors
const theme = {
  bgPrimary: "#1e222d",
  bgSecondary: "#2a2e39",
  bgHover: "#363a45",
  bgActive: "#434651",
  textPrimary: "#d1d4dc",
  textSecondary: "#787b86",
  textMuted: "#5d606b",
  border: "#363a45",
  accent: "#2962ff",
  accentHover: "#1e53e4",
};

export default function LeftToolbar({
  activeTool,
  onToolChange,
  onClearDrawings,
  drawingsCount = 0,
}: LeftToolbarProps) {
  const [openCategory, setOpenCategory] = useState<ToolCategory | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        toolbarRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !toolbarRef.current.contains(event.target as Node)
      ) {
        setOpenCategory(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenCategory(null);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleCategoryClick = useCallback((categoryId: ToolCategory) => {
    setOpenCategory((prev) => (prev === categoryId ? null : categoryId));
  }, []);

  const handleToolSelect = useCallback(
    (toolId: DrawingToolType) => {
      onToolChange(toolId);
      setOpenCategory(null);
    },
    [onToolChange]
  );

  const isToolActive = (toolId: DrawingToolType) => activeTool === toolId;
  const isCategoryActive = (category: CategoryConfig) =>
    category.tools.some((tool) => tool.id === activeTool);

  const currentCategory = DRAWING_TOOLS_CONFIG.find(
    (cat) => cat.id === openCategory
  );

  return (
    <div className="relative flex">
      {/* Main Toolbar */}
      <div
        ref={toolbarRef}
        className="flex flex-col items-center py-2 z-20"
        style={{
          width: "48px",
          backgroundColor: theme.bgPrimary,
          borderRight: `1px solid ${theme.border}`,
        }}
      >
        {/* Category Buttons */}
        <div className="flex flex-col gap-1 flex-1">
          {DRAWING_TOOLS_CONFIG.map((category) => {
            const CategoryIcon = category.icon;
            const isActive = isCategoryActive(category);
            const isOpen = openCategory === category.id;

            return (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className="flex items-center justify-center rounded transition-colors duration-150"
                style={{
                  width: "40px",
                  height: "40px",
                  margin: "0 auto",
                  backgroundColor: isOpen
                    ? theme.bgActive
                    : isActive
                    ? theme.bgHover
                    : "transparent",
                  color: isOpen
                    ? theme.textPrimary
                    : isActive
                    ? theme.textPrimary
                    : theme.textSecondary,
                }}
                onMouseEnter={(e) => {
                  if (!isOpen && !isActive) {
                    e.currentTarget.style.backgroundColor = theme.bgHover;
                    e.currentTarget.style.color = theme.textPrimary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isOpen && !isActive) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = theme.textSecondary;
                  }
                }}
                title={category.name}
              >
                <CategoryIcon size={20} />
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div
          className="w-8 my-2"
          style={{ height: "1px", backgroundColor: theme.border }}
        />

        {/* Bottom Controls */}
        <div className="flex flex-col gap-1">
          {/* Lock Toggle */}
          <button
            onClick={() => setIsLocked(!isLocked)}
            className="flex items-center justify-center rounded transition-colors duration-150"
            style={{
              width: "40px",
              height: "40px",
              margin: "0 auto",
              backgroundColor: isLocked ? theme.bgHover : "transparent",
              color: isLocked ? theme.accent : theme.textSecondary,
            }}
            onMouseEnter={(e) => {
              if (!isLocked) {
                e.currentTarget.style.backgroundColor = theme.bgHover;
                e.currentTarget.style.color = theme.textPrimary;
              }
            }}
            onMouseLeave={(e) => {
              if (!isLocked) {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = theme.textSecondary;
              }
            }}
            title={isLocked ? "Unlock drawings" : "Lock drawings"}
          >
            {isLocked ? <LockIcon size={18} /> : <LockOpenIcon size={18} />}
          </button>

          {/* Visibility Toggle */}
          <button
            onClick={() => setIsVisible(!isVisible)}
            className="flex items-center justify-center rounded transition-colors duration-150"
            style={{
              width: "40px",
              height: "40px",
              margin: "0 auto",
              backgroundColor: !isVisible ? theme.bgHover : "transparent",
              color: !isVisible ? theme.textMuted : theme.textSecondary,
            }}
            onMouseEnter={(e) => {
              if (isVisible) {
                e.currentTarget.style.backgroundColor = theme.bgHover;
                e.currentTarget.style.color = theme.textPrimary;
              }
            }}
            onMouseLeave={(e) => {
              if (isVisible) {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = theme.textSecondary;
              }
            }}
            title={isVisible ? "Hide drawings" : "Show drawings"}
          >
            {isVisible ? <EyeIcon size={18} /> : <EyeOffIcon size={18} />}
          </button>

          {/* Clear All Button */}
          <button
            onClick={onClearDrawings}
            disabled={drawingsCount === 0}
            className="flex items-center justify-center rounded transition-colors duration-150"
            style={{
              width: "40px",
              height: "40px",
              margin: "0 auto",
              backgroundColor: "transparent",
              color: drawingsCount > 0 ? theme.textSecondary : theme.textMuted,
              cursor: drawingsCount > 0 ? "pointer" : "not-allowed",
              opacity: drawingsCount > 0 ? 1 : 0.5,
            }}
            onMouseEnter={(e) => {
              if (drawingsCount > 0) {
                e.currentTarget.style.backgroundColor = theme.bgHover;
                e.currentTarget.style.color = "#ef5350";
              }
            }}
            onMouseLeave={(e) => {
              if (drawingsCount > 0) {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = theme.textSecondary;
              }
            }}
            title={`Clear all drawings${drawingsCount > 0 ? ` (${drawingsCount})` : ""}`}
          >
            <Trash2Icon size={18} />
          </button>
        </div>
      </div>

      {/* Dropdown Popup */}
      {openCategory && currentCategory && (
        <div
          ref={dropdownRef}
          className="absolute left-full top-0 z-10"
          style={{
            marginLeft: "-1px", // Overlap border
          }}
        >
          <div
            className="rounded-r shadow-lg overflow-hidden"
            style={{
              backgroundColor: theme.bgPrimary,
              border: `1px solid ${theme.border}`,
              borderLeft: "none",
              minWidth: "200px",
            }}
          >
            {/* Category Header */}
            <div
              className="px-3 py-2 text-xs font-medium"
              style={{
                color: theme.textSecondary,
                backgroundColor: theme.bgSecondary,
                borderBottom: `1px solid ${theme.border}`,
              }}
            >
              {currentCategory.name}
            </div>

            {/* Tool List */}
            <div className="py-1">
              {currentCategory.tools.map((tool) => {
                const ToolIcon = tool.icon;
                const isActive = isToolActive(tool.id);

                return (
                  <button
                    key={tool.id}
                    onClick={() => handleToolSelect(tool.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 transition-colors duration-150"
                    style={{
                      backgroundColor: isActive ? theme.bgHover : "transparent",
                      color: isActive ? theme.textPrimary : theme.textSecondary,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = theme.bgHover;
                        e.currentTarget.style.color = theme.textPrimary;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = theme.textSecondary;
                      }
                    }}
                    title={tool.description}
                  >
                    <ToolIcon size={18} />
                    <span className="flex-1 text-left text-sm">
                      {tool.name}
                    </span>
                    {tool.shortcut && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          color: theme.textMuted,
                          backgroundColor: theme.bgSecondary,
                        }}
                      >
                        {tool.shortcut}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
