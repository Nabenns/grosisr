"use client"

export function PrintTrigger({ label = "Cetak Struk" }: { label?: string }) {
  return (
    <button
      type="button"
      data-testid="receipt-print"
      onClick={() => window.print()}
      className="print:hidden fixed bottom-4 right-4 rounded-md bg-black px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-neutral-800"
    >
      {label}
    </button>
  )
}
