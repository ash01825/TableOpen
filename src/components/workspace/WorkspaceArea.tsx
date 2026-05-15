import { useCallback, useRef, useState, useEffect } from "react";
import { EditorPanel } from "../editor/EditorPanel";
import { ResultPanel } from "./ResultPanel";
import { useUiStore } from "../../stores/ui-store";

export function WorkspaceArea() {
  const { editorPanelSize, setEditorPanelSize } = useUiStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const percentage = (y / rect.height) * 100;
      setEditorPanelSize(percentage);
    },
    [isDragging, setEditorPanelSize],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col min-h-0 relative overflow-hidden"
    >
      {/* Editor panel */}
      <div style={{ flex: `${editorPanelSize} 1 0`, minHeight: 80 }}>
        <EditorPanel />
      </div>

      {/* Resize handle */}
      <div
        className={`
          h-[3px] flex-shrink-0 relative cursor-row-resize group z-10
          ${isDragging ? "bg-accent" : "hover:bg-accent/30"}
          transition-colors
        `}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-x-0 -top-1.5 -bottom-1.5" />
      </div>

      {/* Results panel */}
      <div style={{ flex: `${100 - editorPanelSize} 1 0`, minHeight: 80 }}>
        <ResultPanel />
      </div>
    </div>
  );
}
