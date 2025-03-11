"use client"

import { useState } from "react"
import { Settings, LogOut, StickyNote, ImageIcon, Info } from "lucide-react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

export default function SystemTray() {
  const [isVisible, setIsVisible] = useState(true)
  const [isAboutOpen, setIsAboutOpen] = useState(false)

  // 在实际应用中，这些函数将调用Tauri API
  const handleNewTextNote = () => {
    console.log("调用Tauri API: 打开新文本便签窗口")
  }

  const handleScreenshot = () => {
    console.log("调用Tauri API: 触发截图工具")
  }

  const handleSettings = () => {
    console.log("调用Tauri API: 打开设置")
  }

  const handleExit = () => {
    console.log("调用Tauri API: 退出应用")
  }

  if (!isVisible) return null

  return (
    <>
      <div className="fixed bottom-4 left-4 z-50">
        <ContextMenu>
          <ContextMenuTrigger>
            <div className="bg-primary text-primary-foreground p-2 rounded-full shadow-lg cursor-pointer">
              <StickyNote className="h-5 w-5" />
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-48">
            <ContextMenuItem onClick={handleNewTextNote}>
              <StickyNote className="mr-2 h-4 w-4" />
              新建文本便签
            </ContextMenuItem>
            <ContextMenuItem onClick={handleScreenshot}>
              <ImageIcon className="mr-2 h-4 w-4" />
              截图
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handleSettings}>
              <Settings className="mr-2 h-4 w-4" />
              设置
            </ContextMenuItem>
            <ContextMenuItem onClick={() => setIsAboutOpen(true)}>
              <Info className="mr-2 h-4 w-4" />
              关于
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handleExit}>
              <LogOut className="mr-2 h-4 w-4" />
              退出
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>

      <Dialog open={isAboutOpen} onOpenChange={setIsAboutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>关于轻量级便签工具</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <div className="space-y-2 py-4">
              <p>轻量级便签工具 v1.0.0</p>
              <p>基于Tauri + Rust + React开发</p>
              <p>安装包大小: 8.5MB</p>
              <p>内存占用: &lt;50MB</p>
              <p>数据存储: SQLite (加密存储)</p>
              <p className="text-xs text-muted-foreground mt-4">© 2023 轻量级便签工具</p>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  )
}

