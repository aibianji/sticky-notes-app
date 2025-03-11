"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { systemApi, notesApi } from "@/lib/tauri-api"

export default function ScreenshotTool() {
  const [isSelecting, setIsSelecting] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [endPos, setEndPos] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const canvasRef = useRef(null)
  const { toast } = useToast()

  // 在实际应用中，这将使用Tauri API捕获屏幕

  useEffect(() => {
    const handleMouseDown = (e) => {
      if (isSelecting) {
        setStartPos({ x: e.clientX, y: e.clientY })
        setEndPos({ x: e.clientX, y: e.clientY })
        setIsDragging(true)
      }
    }

    const handleMouseMove = (e) => {
      if (isDragging) {
        setEndPos({ x: e.clientX, y: e.clientY })
      }
    }

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false)
      }
    }

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        window.close()
      }
    }

    window.addEventListener("mousedown", handleMouseDown)
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("mousedown", handleMouseDown)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isSelecting, isDragging])

  useEffect(() => {
    setIsSelecting(true)
  }, [])

  const handleCapture = async () => {
    try {
      // 在实际应用中，这将调用Tauri API捕获屏幕区域
      const area = {
        x: Math.min(startPos.x, endPos.x),
        y: Math.min(startPos.y, endPos.y),
        width: Math.abs(endPos.x - startPos.x),
        height: Math.abs(endPos.y - startPos.y),
      }

      // 模拟截图
      const result = await systemApi.takeScreenshot()

      // 保存截图为便签
      await notesApi.addNote({
        content: result.path,
        type: "image",
        color: "bg-white",
        createdAt: new Date().toISOString(),
      })

      toast({
        title: "截图已保存",
        description: "截图已成功保存为便签",
      })

      // 关闭窗口
      window.close()
    } catch (error) {
      console.error("截图失败:", error)
      toast({
        title: "截图失败",
        description: "无法捕获屏幕区域，请重试",
        variant: "destructive",
      })
    }
  }

  const handleCancel = () => {
    window.close()
  }

  const selectionStyle = {
    left: `${Math.min(startPos.x, endPos.x)}px`,
    top: `${Math.min(startPos.y, endPos.y)}px`,
    width: `${Math.abs(endPos.x - startPos.x)}px`,
    height: `${Math.abs(endPos.y - startPos.y)}px`,
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm cursor-crosshair">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {isDragging && <div className="absolute border-2 border-primary bg-primary/10" style={selectionStyle} />}

      {!isDragging && endPos.x !== 0 && (
        <>
          <div className="absolute border-2 border-primary bg-primary/10" style={selectionStyle} />
          <div
            className="absolute flex gap-2"
            style={{
              left: `${Math.min(startPos.x, endPos.x) + Math.abs(endPos.x - startPos.x) / 2 - 50}px`,
              top: `${Math.min(startPos.y, endPos.y) + Math.abs(endPos.y - startPos.y) + 10}px`,
            }}
          >
            <Button size="sm" variant="default" onClick={handleCapture}>
              <Check className="h-4 w-4 mr-1" />
              截取
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-1" />
              取消
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

