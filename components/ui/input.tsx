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
      className={`flex h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm 
      placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400
      disabled:cursor-not-allowed disabled:opacity-50 transition-all
      shadow-[0_1px_2px_rgba(0,0,0,0.04)]
      ${error ? "border-red-400 focus:ring-red-400 focus:border-red-400" : ""}
      ${className}`}
      {...props}
    />
  )
} 