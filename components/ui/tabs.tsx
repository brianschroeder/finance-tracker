"use client"

import * as React from "react"

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

export function Tabs({ 
  defaultValue, 
  value, 
  onValueChange, 
  children, 
  className = "", 
  ...props 
}: TabsProps) {
  const [tabValue, setTabValue] = React.useState(value || defaultValue || "")
  
  React.useEffect(() => {
    if (value !== undefined) {
      setTabValue(value)
    }
  }, [value])

  const handleValueChange = (newValue: string) => {
    setTabValue(newValue)
    onValueChange?.(newValue)
  }

  const contextValue = React.useMemo(() => ({
    value: tabValue,
    onValueChange: handleValueChange,
  }), [tabValue])

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={className} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function TabsList({ className = "", children, ...props }: TabsListProps) {
  return (
    <div 
      className={`inline-flex items-center justify-center rounded-md bg-gray-100 p-1 ${className}`} 
      role="tablist"
      {...props}
    >
      {children}
    </div>
  )
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
  children: React.ReactNode
}

export function TabsTrigger({ 
  className = "", 
  value, 
  children, 
  ...props 
}: TabsTriggerProps) {
  const { value: selectedValue, onValueChange } = React.useContext(TabsContext)
  const isSelected = selectedValue === value

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      data-state={isSelected ? "active" : "inactive"}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 
      ${isSelected 
        ? "bg-white text-gray-900 shadow-sm" 
        : "text-gray-500 hover:text-gray-900"
      } ${className}`}
      onClick={() => onValueChange(value)}
      {...props}
    >
      {children}
    </button>
  )
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  children: React.ReactNode
}

export function TabsContent({ 
  className = "", 
  value, 
  children, 
  ...props 
}: TabsContentProps) {
  const { value: selectedValue } = React.useContext(TabsContext)
  const isSelected = selectedValue === value

  if (!isSelected) return null

  return (
    <div
      role="tabpanel"
      data-state={isSelected ? "active" : "inactive"}
      className={className}
      {...props}
    >
      {children}
    </div>
  )
}

// Context
interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue>({
  value: "",
  onValueChange: () => {},
}) 