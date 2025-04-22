"use client"

import * as React from "react"

type ToastType = "default" | "success" | "error" | "warning" | "info"

interface ToastProps {
  title?: string
  description?: string
  variant?: ToastType
  duration?: number
}

interface ToastContextType {
  toast: (props: ToastProps) => void
}

// Create a separate variable to hold the toast function
// This will be set by the provider and used by the exported toast function
let toastFn: (props: ToastProps) => void = () => {
  console.warn("Toast function called before ToastProvider was initialized")
}

const ToastContext = React.createContext<ToastContextType>({
  toast: (props) => toastFn(props),
})

export const useToast = () => {
  return React.useContext(ToastContext)
}

// Export a non-hook version that can be called anywhere
export function toast(props: ToastProps) {
  toastFn(props)
}

interface ToastProviderProps {
  children: React.ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<(ToastProps & { id: string })[]>([])
  
  const addToast = React.useCallback((props: ToastProps) => {
    const id = Math.random().toString(36).substring(2, 9)
    const duration = props.duration || 5000
    
    setToasts((prevToasts) => [...prevToasts, { ...props, id }])
    
    setTimeout(() => {
      setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
    }, duration)
  }, [])
  
  // Set the external toast function
  React.useEffect(() => {
    toastFn = addToast
    return () => {
      toastFn = () => {
        console.warn("Toast function called after ToastProvider was unmounted")
      }
    }
  }, [addToast])
  
  const contextValue = React.useMemo(() => ({
    toast: addToast,
  }), [addToast])
  
  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      
      {/* Toast container */}
      <div className="fixed bottom-0 right-0 z-50 p-4 space-y-4 max-w-md">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function Toast({ title, description, variant = "default" }: ToastProps & { id: string }) {
  const getVariantClasses = () => {
    switch (variant) {
      case "success":
        return "bg-blue-50 border-blue-500 text-blue-800"
      case "error":
        return "bg-blue-50 border-blue-500 text-blue-800"
      case "warning":
        return "bg-blue-50 border-blue-500 text-blue-800"
      case "info":
        return "bg-blue-50 border-blue-500 text-blue-800"
      default:
        return "bg-white border-gray-300 text-gray-800"
    }
  }
  
  return (
    <div className={`rounded-lg border shadow-sm p-4 animate-fade-in-up ${getVariantClasses()}`}>
      {title && <h3 className="font-medium mb-1">{title}</h3>}
      {description && <p className="text-sm opacity-90">{description}</p>}
    </div>
  )
} 