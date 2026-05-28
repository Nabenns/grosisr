"use client"

import { forwardRef, type InputHTMLAttributes } from "react"
import { Input } from "@/components/ui/input"

export const CurrencyInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function CurrencyInput(props, ref) {
    return <Input ref={ref} type="text" inputMode="numeric" pattern="[0-9]*" {...props} />
  }
)
