"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Decimal from "decimal.js"
import { Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { formatIDR } from "@/lib/money"
import { searchPOSProductsAction, postSaleAction } from "../actions"

interface CustomerOption {
  id: string
  code: string
  name: string
  customerType: "RESELLER" | "RETAIL"
}

interface CartItem {
  productUnitId: string
  productId: string
  sku: string
  name: string
  unitName: string
  qty: number
  price: number
  discount: number
  stockBalance: number
}

interface SearchResult {
  productUnitId: string
  productId: string
  sku: string
  name: string
  unitName: string
  conversionToBase: number
  salePrice: number
  stockBalance: number
}

interface Props {
  warehouseId: string
  warehouseName: string
  customers: CustomerOption[]
  userPermissions: string[]
}

function genIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
export function POSCart({ warehouseId, warehouseName, customers, userPermissions }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerId, setCustomerId] = useState<string>(
    customers.find((c) => c.code === "CUS-WALKIN")?.id ?? ""
  )
  const [saleType, setSaleType] = useState<"CASH" | "CREDIT">("CASH")
  const [paymentMethod, setPaymentMethod] = useState<"TUNAI" | "TRANSFER" | "QRIS" | "KARTU">(
    "TUNAI"
  )
  const [paymentRefNo, setPaymentRefNo] = useState("")
  const [discountAmount, setDiscountAmount] = useState(0)
  const [paidAmount, setPaidAmount] = useState(0)
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  )
  const [resultModal, setResultModal] = useState<null | {
    code: string
    total: number
    paid: number
    change: number
    invoiceId: string
  }>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const paymentInputRef = useRef<HTMLInputElement>(null)
  const idempotencyRef = useRef<string>(genIdempotencyKey())

  const canDiscount = userPermissions.includes("sale.discount.apply")
  const canEditPrice = canDiscount

  const subtotal = cart.reduce(
    (acc, i) =>
      acc.plus(new Decimal(i.qty).times(i.price).minus(new Decimal(i.qty).times(i.discount))),
    new Decimal(0)
  )
  const total = subtotal.minus(new Decimal(discountAmount))
  const change =
    saleType === "CASH" ? Decimal.max(0, new Decimal(paidAmount).minus(total)) : new Decimal(0)

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "F2") {
        e.preventDefault()
        searchInputRef.current?.focus()
      } else if (e.key === "F8") {
        e.preventDefault()
        if (saleType === "CASH") paymentInputRef.current?.focus()
      } else if (e.key === "Escape") {
        if (showResults) setShowResults(false)
        else if (cart.length > 0 && confirm("Batalkan semua item di cart?")) setCart([])
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [showResults, cart.length, saleType])

  async function handleSearch(q: string) {
    setSearch(q)
    if (q.length < 2) {
      setResults([])
      setShowResults(false)
      return
    }
    const r = await searchPOSProductsAction(q, warehouseId)
    if (!r.success) return
    setResults(r.data)
    setShowResults(true)
    // Auto-add if exact barcode hit (single result with matching unique attributes)
    if (r.data.length === 1 && r.data[0]) {
      const found = r.data[0]
      // Heuristic: if input is all digits and >= 8 chars, likely a barcode scan
      if (/^\d{8,}$/.test(q)) {
        addToCart(found)
        setSearch("")
        setResults([])
        setShowResults(false)
      }
    }
  }

  function addToCart(p: SearchResult) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productUnitId === p.productUnitId)
      if (existing) {
        return prev.map((i) =>
          i.productUnitId === p.productUnitId ? { ...i, qty: i.qty + 1 } : i
        )
      }
      return [
        ...prev,
        {
          productUnitId: p.productUnitId,
          productId: p.productId,
          sku: p.sku,
          name: p.name,
          unitName: p.unitName,
          qty: 1,
          price: p.salePrice,
          discount: 0,
          stockBalance: p.stockBalance
        }
      ]
    })
  }

  function updateItem(idx: number, patch: Partial<CartItem>) {
    setCart((prev) => prev.map((i, j) => (j === idx ? { ...i, ...patch } : i)))
  }

  function removeItem(idx: number) {
    setCart((prev) => prev.filter((_, j) => j !== idx))
  }

  function checkout() {
    if (cart.length === 0) {
      toast.error("Cart kosong")
      return
    }
    if (saleType === "CASH" && new Decimal(paidAmount).lt(total)) {
      toast.error("Pembayaran kurang dari total")
      return
    }
    start(async () => {
      const result = await postSaleAction({
        customerId: customerId || null,
        warehouseId,
        saleType,
        invoiceDate: new Date(),
        dueDate: saleType === "CREDIT" ? new Date(dueDate) : null,
        discountAmount,
        taxAmount: 0,
        paymentMethod: saleType === "CASH" ? paymentMethod : null,
        paymentRefNo: paymentRefNo || null,
        paidAmount,
        idempotencyKey: idempotencyRef.current,
        items: cart.map((i) => ({
          productUnitId: i.productUnitId,
          qty: i.qty,
          price: i.price,
          discount: i.discount
        }))
      })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success(`Penjualan ${result.data.code} berhasil`)
      setResultModal({
        code: result.data.code,
        total: result.data.total,
        paid: result.data.paidAmount,
        change: result.data.changeAmount,
        invoiceId: result.data.id
      })
      // Reset for next transaction
      setCart([])
      setPaidAmount(0)
      setDiscountAmount(0)
      setPaymentRefNo("")
      idempotencyRef.current = genIdempotencyKey()
    })
  }
  return (
    <div className="grid grid-cols-12 gap-4 h-[calc(100vh-9rem)]">
      {/* LEFT: search + cart */}
      <div className="col-span-7 flex flex-col gap-4">
        <Card>
          <CardContent className="pt-6 relative">
            <Label htmlFor="search">Cari produk (F2) - SKU, nama, atau scan barcode</Label>
            <Input
              ref={searchInputRef}
              id="search"
              autoFocus
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Ketik atau scan barcode..."
              className="mt-2"
            />
            {showResults && results.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 mx-6 bg-popover border rounded-md shadow-lg max-h-80 overflow-auto z-10">
                {results.map((r) => (
                  <button
                    key={r.productUnitId}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-accent flex justify-between items-center text-sm"
                    onClick={() => {
                      addToCart(r)
                      setSearch("")
                      setShowResults(false)
                      searchInputRef.current?.focus()
                    }}
                  >
                    <div>
                      <div className="font-medium">
                        {r.sku} - {r.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.unitName} - Stok: {r.stockBalance}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">{formatIDR(r.salePrice)}</div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex-1 overflow-hidden">
          <CardContent className="pt-6 h-full flex flex-col">
            {cart.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Cart kosong. Cari produk untuk menambah.
              </div>
            ) : (
              <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-left border-b sticky top-0 bg-background">
                    <tr>
                      <th className="pb-2">#</th>
                      <th>Produk</th>
                      <th>Qty</th>
                      <th>Harga</th>
                      <th>Disc/unit</th>
                      <th>Subtotal</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item, i) => {
                      const sub = item.qty * (item.price - item.discount)
                      return (
                        <tr key={i} className="border-b">
                          <td className="py-2">{i + 1}</td>
                          <td>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.sku} - {item.unitName} - Stok: {item.stockBalance}
                            </div>
                          </td>
                          <td>
                            <Input
                              type="number"
                              step="0.0001"
                              min="0"
                              value={item.qty}
                              onChange={(e) => updateItem(i, { qty: Number(e.target.value) })}
                              className="w-20"
                            />
                          </td>
                          <td>
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              disabled={!canEditPrice}
                              value={item.price}
                              onChange={(e) => updateItem(i, { price: Number(e.target.value) })}
                              className="w-28"
                            />
                          </td>
                          <td>
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              disabled={!canDiscount}
                              value={item.discount}
                              onChange={(e) => updateItem(i, { discount: Number(e.target.value) })}
                              className="w-24"
                            />
                          </td>
                          <td className="font-medium">{formatIDR(sub)}</td>
                          <td>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(i)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* RIGHT: customer + payment */}
      <div className="col-span-5 flex flex-col gap-4">
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="text-sm font-medium">{warehouseName}</div>
            <div className="space-y-2">
              <Label>Customer (F4)</Label>
              <Select value={customerId} onValueChange={(v) => v && setCustomerId(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipe Penjualan</Label>
              <Select value={saleType} onValueChange={(v) => v && setSaleType(v as "CASH" | "CREDIT")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">CASH (langsung lunas)</SelectItem>
                  <SelectItem value="CREDIT">CREDIT (utang)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatIDR(subtotal.toNumber())}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <Label htmlFor="discountAmount">Diskon Faktur</Label>
              <Input
                id="discountAmount"
                type="number"
                step="1"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Number(e.target.value))}
                disabled={!canDiscount}
                className="w-32"
              />
            </div>
            <div className="flex justify-between text-base font-bold border-t pt-2">
              <span>TOTAL</span>
              <span>{formatIDR(total.toNumber())}</span>
            </div>

            {saleType === "CASH" ? (
              <div className="space-y-3 pt-3 border-t">
                <div className="space-y-2">
                  <Label>Metode Pembayaran</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(v) =>
                      v && setPaymentMethod(v as "TUNAI" | "TRANSFER" | "QRIS" | "KARTU")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TUNAI">Tunai</SelectItem>
                      <SelectItem value="TRANSFER">Transfer</SelectItem>
                      <SelectItem value="QRIS">QRIS</SelectItem>
                      <SelectItem value="KARTU">Kartu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {paymentMethod !== "TUNAI" && (
                  <div className="space-y-2">
                    <Label htmlFor="paymentRefNo">No. Referensi</Label>
                    <Input
                      id="paymentRefNo"
                      value={paymentRefNo}
                      onChange={(e) => setPaymentRefNo(e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="paidAmount">Bayar (F8)</Label>
                  <Input
                    ref={paymentInputRef}
                    id="paidAmount"
                    type="number"
                    step="1"
                    min="0"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    className="text-lg"
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Kembali</span>
                  <span className="font-semibold">{formatIDR(change.toNumber())}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-3 border-t">
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Jatuh Tempo *</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paidAmount">Pembayaran Awal (DP)</Label>
                  <Input
                    id="paidAmount"
                    type="number"
                    step="1"
                    min="0"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                  />
                </div>
              </div>
            )}

            <Button
              type="button"
              onClick={checkout}
              disabled={pending || cart.length === 0}
              className="w-full"
              size="lg"
            >
              {pending ? "Memproses..." : "Bayar (F8)"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Result modal */}
      <Dialog open={!!resultModal} onOpenChange={(open) => !open && setResultModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Penjualan berhasil</DialogTitle>
            <DialogDescription>
              {resultModal && (
                <>
                  {resultModal.code} - Total: {formatIDR(resultModal.total)} - Bayar:{" "}
                  {formatIDR(resultModal.paid)} - Kembali: {formatIDR(resultModal.change)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (resultModal) {
                  window.open(`/sale/invoices/${resultModal.invoiceId}/receipt`, "_blank")
                }
              }}
            >
              Cetak Struk
            </Button>
            <Button
              onClick={() => {
                setResultModal(null)
                searchInputRef.current?.focus()
              }}
            >
              Lanjut Transaksi (Enter)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}