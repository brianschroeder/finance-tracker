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
      className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm 
      placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
      disabled:cursor-not-allowed disabled:opacity-50
      ${error ? "border-red-500 focus:ring-red-500" : ""}
      ${className}`}
      {...props}
    />
  )
} 