"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ImageIcon, Palette, X } from "lucide-react"
import Image from "next/image"

const colorOptions = [
  { name: "黄色", value: "bg-yellow-100" },
  { name: "蓝色", value: "bg-blue-100" },
  { name: "绿色", value: "bg-green-100" },
  { name: "紫色", value: "bg-purple-100" },
  { name: "粉色", value: "bg-pink-100" },
  { name: "橙色", value: "bg-orange-100" },
  { name: "白色", value: "bg-white" },
]

export default function NoteEditor({ note, onSave, onCancel }) {
  // 确保note存在，防止undefined错误
  const safeNote = note || {}

  const [text, setText] = useState(safeNote.type === "text" ? safeNote.content || "" : "")
  const [color, setColor] = useState(safeNote.color || "bg-yellow-100")
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [images, setImages] = useState(safeNote.type === "image" ? [safeNote.content] : [])
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    // 聚焦文本区域
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

  const handleSave = () => {
    if (!text.trim() && images.length === 0) return

    const currentDate = new Date().toISOString()

    if (images.length > 0) {
      // 如果有图片，保存为图片便签
      onSave({
        content: images[0], // 目前只支持一张图片，可以扩展为支持多张
        type: "image",
        color,
        createdAt: safeNote.createdAt || currentDate,
        ...(safeNote.id ? { id: safeNote.id } : {}),
      })
    } else {
      // 否则保存为文本便签
      onSave({
        content: text,
        type: "text",
        color,
        createdAt: safeNote.createdAt || currentDate,
        ...(safeNote.id ? { id: safeNote.id } : {}),
      })
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

  const handleKeyDown = (e) => {
    // Ctrl+Enter 保存
    if (e.ctrlKey && e.key === "Enter") {
      handleSave()
    }
  }

  return (
    <div className={`flex flex-col gap-4 ${color}`}>
      <div className="relative min-h-[200px] rounded-md border border-input">
        {images.length > 0 ? (
          <div className="relative aspect-video">
            <Image src={images[0] || "/placeholder.svg"} alt="便签图片" fill className="object-contain rounded-t-md" />
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
            className={`w-full h-full min-h-[200px] p-3 resize-none border-0 focus:outline-none rounded-md ${color}`}
            placeholder="在此输入便签内容..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        )}
      </div>

      <div className="flex justify-between items-center">
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
                      setColor(option.value)
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
          {onCancel && (
            <Button variant="outline" size="sm" onClick={onCancel}>
              取消
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={!text.trim() && images.length === 0}>
            保存
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">提示: 您可以直接粘贴图片 (Ctrl+V) 到便签中</div>
    </div>
  )
}

