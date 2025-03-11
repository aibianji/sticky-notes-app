"use client"

import { useState } from "react"
import Image from "next/image"
import { format, isValid, parseISO } from "date-fns"
import { MoreHorizontal, Edit, Trash, Copy, ExternalLink } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import NoteEditor from "./note-editor"

export default function NoteItem({ note, onUpdate, onDelete }) {
  const [isEditOpen, setIsEditOpen] = useState(false)

  // 安全地格式化日期，处理无效日期的情况
  const formatDate = (dateString) => {
    // 检查日期字符串是否存在
    if (!dateString) {
      return "日期未知"
    }

    try {
      // 尝试解析日期
      const date = parseISO(dateString)
      // 检查日期是否有效
      if (!isValid(date)) {
        return "日期未知"
      }
      return format(date, "yyyy年MM月dd日 HH:mm")
    } catch (error) {
      console.error("日期格式化错误:", error)
      return "日期未知"
    }
  }

  // 使用默认值确保note.createdAt存在
  const formattedDate = formatDate(note?.createdAt || null)

  const handleEdit = (updatedNote) => {
    onUpdate({ ...updatedNote, id: note.id })
    setIsEditOpen(false)
  }

  const handleDelete = () => {
    onDelete(note.id)
  }

  const handleCopy = () => {
    if (note.type === "text") {
      navigator.clipboard.writeText(note.content)
    }
  }

  return (
    <>
      <Card className={`overflow-hidden hover:shadow-md transition-shadow ${note.color || "bg-white"}`}>
        <CardContent className="p-0">
          {note.type === "text" ? (
            <div className="p-4 cursor-pointer min-h-[100px]" onDoubleClick={() => setIsEditOpen(true)}>
              <p className="whitespace-pre-wrap break-words">{note.content}</p>
            </div>
          ) : (
            <div className="relative aspect-video cursor-pointer" onDoubleClick={() => setIsEditOpen(true)}>
              <Image
                src={note.content || "/placeholder.svg"}
                alt="截图"
                fill
                className="object-cover"
                onError={(e) => {
                  // 如果图片加载失败，使用占位图
                  e.currentTarget.src = "/placeholder.svg?height=720&width=1280"
                }}
              />
            </div>
          )}
        </CardContent>
        <CardFooter className="p-2 bg-background/50 flex justify-between items-center text-xs text-muted-foreground sticky bottom-0 left-0 right-0">
          <span>{formattedDate}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                编辑
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete}>
                <Trash className="mr-2 h-4 w-4" />
                删除
              </DropdownMenuItem>
              {note.type === "text" && (
                <DropdownMenuItem onClick={handleCopy}>
                  <Copy className="mr-2 h-4 w-4" />
                  复制
                </DropdownMenuItem>
              )}
              {note.type === "image" && (
                <DropdownMenuItem onClick={() => window.open(note.content, "_blank")}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  打开
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑便签</DialogTitle>
          </DialogHeader>
          <NoteEditor note={note} onSave={handleEdit} onCancel={() => setIsEditOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}

