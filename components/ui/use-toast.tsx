"use client"

// 这是一个简化版的toast组件，实际应用中可以使用shadcn/ui的toast组件
import { createContext, useContext, useState } from "react"

type ToastType = {
  title: string
  description?: string
  variant?: "default" | "destructive"
}

type ToastContextType = {
  toast: (props: ToastType) => void
}

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
})

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState<ToastType[]>([])

  const toast = (props: ToastType) => {
    setToasts([...toasts, props])
    // 自动移除toast
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t !== props))
    }, 3000)
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t, i) => (
          <div
            key={i}
            className={`p-4 rounded-md shadow-md ${t.variant === "destructive" ? "bg-destructive text-destructive-foreground" : "bg-background border"}`}
          >
            <div className="font-medium">{t.title}</div>
            {t.description && <div className="text-sm opacity-90">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

