"use client"

import { useEffect, useRef, useState } from "react"
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDetected: (code: string) => void
}

/**
 * Live camera barcode scanner. Uses @zxing/browser and prefers the rear camera.
 * Falls back to a manual input when the camera is unavailable or permission is denied.
 */
export function BarcodeScanner({ open, onOpenChange, onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [manual, setManual] = useState("")

  useEffect(() => {
    if (!open) return
    setError(null)
    const reader = new BrowserMultiFormatReader()
    let stopped = false

    reader
      .decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } },
        videoRef.current!,
        (result, _err, controls) => {
          controlsRef.current = controls
          if (stopped || !result) return
          stopped = true
          controls.stop()
          onDetected(result.getText())
          onOpenChange(false)
        }
      )
      .catch(() => {
        setError("Kamera tidak tersedia atau izin ditolak. Pakai input manual di bawah.")
      })

    return () => {
      stopped = true
      controlsRef.current?.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function submitManual() {
    const code = manual.trim()
    if (!code) return
    onDetected(code)
    setManual("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan Barcode</DialogTitle>
          <DialogDescription>
            Arahkan kamera ke barcode. Hasil scan langsung masuk ke keranjang.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <video
            ref={videoRef}
            data-testid="barcode-video"
            className="w-full rounded-md bg-black aspect-video object-cover"
            muted
            playsInline
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <input
              data-testid="barcode-manual"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitManual()}
              placeholder="Atau ketik kode barcode manual..."
              className="flex-1 h-9 rounded-md border bg-background px-3 text-sm"
            />
            <Button type="button" variant="outline" onClick={submitManual}>
              Pakai
            </Button>
          </div>
        </div>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  )
}
