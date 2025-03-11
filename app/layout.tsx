import { ToastProvider } from "@/components/ui/use-toast"
import SystemTray from "@/components/system-tray"
import "./globals.css"

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <ToastProvider>
          {children}
          <SystemTray />
        </ToastProvider>
      </body>
    </html>
  )
}



import './globals.css'

export const metadata = {
      generator: 'v0.dev'
    };
