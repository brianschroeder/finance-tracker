"use client"

import * as React from "react"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export function Input({
  className = "",
  type = "text",
  error = false,
  onChange,
  value,
  ...props
}: InputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      className={`flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950
      placeholder:text-slate-400 focus:outline-none focus:border-slate-400
      disabled:cursor-not-allowed disabled:opacity-50 transition-colors
      ${error ? "border-rose-400 focus:border-rose-400" : ""}
      ${className}`}
      {...props}
    />
  )
} 
