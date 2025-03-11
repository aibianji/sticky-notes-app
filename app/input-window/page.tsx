"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { ImageIcon, Palette, X } from "lucide-react"
import Image from "next/image"
import { useToast } from "@/components/ui/use-toast"
import { notesApi } from "@/lib/tauri-api"

const colorOptions = [
  { name: "黄色", value: "bg-yellow-100" },
  { name: "蓝色", value: "bg-blue-100" },
  { name: "绿色", value: "bg-green-100" },
  { name: "紫色", value: "bg-purple-100" },
  { name: "粉色", value: "bg-pink-100" },
  { name: "橙色", value: "bg-orange-100" },
  { name: "白色", value: "bg-white" },
]

export default function InputWindow() {
  const [noteText, setNoteText] = useState("")
  const [noteColor, setNoteColor] = useState("bg-yellow-100")
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [images, setImages] = useState([])
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const { toast } = useToast()

  useEffect(() => {
    // Focus the textarea when the window opens
    if (textareaRef.current) {
      textareaRef.current.focus()
    }

    // 添加粘贴事件监听器
    const handlePaste = (e) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile()
          const url = URL.createObjectURL(blob)
          setImages((prev) => [...prev, url])
          e.preventDefault()
          return
        }
      }
    }

    window.addEventListener("paste", handlePaste)
    return () => window.removeEventListener("paste", handlePaste)
  }, [])

  const handleSave = async () => {
    if (!noteText.trim() && images.length === 0) return

    try {
      // 在实际应用中，这里会调用Tauri API保存到SQLite
      const noteData = {
        content: images.length > 0 ? images[0] : noteText,
        type: images.length > 0 ? "image" : "text",
        color: noteColor,
        createdAt: new Date().toISOString(),
      }

      await notesApi.addNote(noteData)

      toast({
        title: "便签已保存",
        description: "您的便签已成功保存",
      })

      // 清空并关闭
      setNoteText("")
      setImages([])
      window.close()
    } catch (error) {
      console.error("保存便签失败:", error)
      toast({
        title: "保存失败",
        description: "无法保存便签，请重试",
        variant: "destructive",
      })
    }
  }

  const handleKeyDown = (e) => {
    // Save on Ctrl+Enter
    if (e.ctrlKey && e.key === "Enter") {
      handleSave()
    }
    // Close on Escape
    if (e.key === "Escape") {
      window.close()
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type.match("image.*")) {
      const url = URL.createObjectURL(file)
      setImages((prev) => [...prev, url])
    }
  }

  const handleRemoveImage = (index) => {
    setImages(images.filter((_, i) => i !== index))
  }

  return (
    <div className={`min-h-screen flex flex-col ${noteColor}`}>
      <div className="flex items-center justify-between p-2 bg-background/50 border-b">
        <h2 className="text-sm font-medium">快速便签</h2>
        <div className="text-xs text-muted-foreground">按 Ctrl+Enter 保存，Esc 取消</div>
      </div>

      <ResizablePanelGroup direction="vertical" className="flex-1">
        <ResizablePanel defaultSize={100} minSize={30}>
          {images.length > 0 ? (
            <div className="relative h-full">
              <Image src={images[0] || "/placeholder.svg"} alt="便签图片" fill className="object-contain p-4" />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => handleRemoveImage(0)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              className={`w-full h-full p-4 resize-none border-0 focus:outline-none ${noteColor}`}
              placeholder="在此输入便签内容..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          )}
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={0} minSize={0}>
          {/* This empty panel allows for resizing */}
        </ResizablePanel>
      </ResizablePanelGroup>

      <div className="p-2 border-t bg-background/50 flex justify-between items-center">
        <div className="flex gap-2">
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="flex gap-1"
            >
              <Palette className="h-4 w-4" />
              颜色
            </Button>
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 p-2 bg-background border rounded-md shadow-md z-10 grid grid-cols-4 gap-1">
                {colorOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`w-6 h-6 rounded-full cursor-pointer ${option.value} border`}
                    title={option.name}
                    onClick={() => {
                      setNoteColor(option.value)
                      setShowColorPicker(false)
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="flex gap-1">
            <ImageIcon className="h-4 w-4" />
            添加图片
          </Button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.close()}>
            取消
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!noteText.trim() && images.length === 0}>
            保存便签
          </Button>
        </div>
      </div>
    </div>
  )
}

