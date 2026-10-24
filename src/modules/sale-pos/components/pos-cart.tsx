"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Decimal from "decimal.js"
import { Trash2, Search, Plus, Minus, CreditCard, QrCode, Banknote, DollarSign, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    (acc, i) => acc.plus(new Decimal(i.qty).times(i.price).minus(new Decimal(i.qty).times(i.discount))),
    new Decimal(0)
  )
  const total = subtotal.minus(new Decimal(discountAmount))
  const change = saleType === "CASH" ? Decimal.max(0, new Decimal(paidAmount).minus(total)) : new Decimal(0)

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
    // Auto-add if exact barcode hit (single result)
    if (r.data.length === 1 && r.data[0] && /^\d{8,}$/.test(q)) {
      addToCart(r.data[0])
      setSearch("")
      setResults([])
      setShowResults(false)
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

  const QUICK_PAY_AMOUNTS = [25000, 50000, 100000, 200000, 500000]

  return (
    <div className="grid grid-cols-12 gap-4 h-[calc(100vh-9rem)]">
      {/* LEFT: search + cart */}
      <div className="col-span-7 flex flex-col gap-4">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              Cari Produk
            </CardTitle>
            <div className="text-xs text-muted-foreground">F2</div>
          </CardHeader>
          <CardContent className="pt-0 relative">
            <Input
              ref={searchInputRef}
              autoFocus
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Ketik SKU / nama produk, atau scan barcode..."
              className="mt-2 max-w-md"
            />
            {showResults && results.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 mx-6 bg-popover border rounded-md shadow-2xl max-h-96 overflow-auto z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                {results.map((r) => (
                  <button
                    key={r.productUnitId}
                    type="button"
                    className="w-full text-left px-4 py-3 hover:bg-accent border-b border-border flex justify-between items-center text-sm transition-colors"
                    onClick={() => {
                      addToCart(r)
                      setSearch("")
                      setShowResults(false)
                      searchInputRef.current?.focus()
                    }}
                  >
                    <div>
                      <div className="font-medium">{r.sku} - {r.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.unitName} &bull; Stok {r.stockBalance}
                      </div>
                    </div>
                    <div className="font-semibold text-right w-24">{formatIDR(r.salePrice)}</div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex-1 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Keranjang
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 h-full flex flex-col">
            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-2">
                <div className="text-xl opacity-50">🛒</div>
                <div>Cart kosong. Cari produk untuk menambah.</div>
                <div className="text-xs opacity-60">Ketik atau scan barcode, lalu Enter.</div>
              </div>
            ) : (
              <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-left border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm">
                    <tr>
                      <th className="pb-2 w-6 text-center">#</th>
                      <th className="pb-2 pl-2">Produk</th>
                      <th className="pb-2 w-20 text-right">Qty</th>
                      <th className="pb-2 w-32 text-right">Harga</th>
                      <th className="pb-2 w-32 text-right">Disc/unit</th>
                      <th className="pb-2 w-32 text-right">Subtotal</th>
                      <th className="pb-2 w-16 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {cart.map((item, i) => {
                      const sub = item.qty * (item.price - item.discount)
                      return (
                        <tr key={i} className="border-b border-border hover:bg-muted/20 transition-colors">
                          <td className="py-3 pl-2 text-center text-xs text-muted-foreground font-mono">
                            {i + 1}
                          </td>
                          <td className="py-3 pl-2">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.sku} &bull; {item.unitName}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              Stok {item.stockBalance}
                            </div>
                          </td>
                          <td className="py-3 pl-2 w-20 text-right">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  updateItem(i, { qty: Math.max(0.0001, item.qty - 1) })
                                }
                                disabled={item.qty <= 0.0001}
                                className="h-6 w-6 rounded border bg-background flex items-center justify-center disabled:opacity-50"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <Input
                                type="number"
                                step="0.0001"
                                min="0"
                                value={item.qty}
                                onChange={(e) => updateItem(i, { qty: Number(e.target.value) })}
                                className="w-16 text-right h-8 px-2 border-0 focus:ring-0 text-sm font-medium"
                              />
                              <button
                                type="button"
                                onClick={() => updateItem(i, { qty: item.qty + 1 })}
                                className="h-6 w-6 rounded border bg-background flex items-center justify-center"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 pl-2 w-32 text-right">
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              disabled={!canEditPrice}
                              value={item.price}
                              onChange={(e) => updateItem(i, { price: Number(e.target.value) })}
                              className="w-28 text-right h-8 px-2 border-0 focus:ring-0 text-sm font-medium"
                            />
                          </td>
                          <td className="py-3 pl-2 w-32 text-right">
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              disabled={!canDiscount}
                              value={item.discount}
                              onChange={(e) => updateItem(i, { discount: Number(e.target.value) })}
                              className="w-24 text-right h-8 px-2 border-0 focus:ring-0 text-sm"
                            />
                          </td>
                          <td className="py-3 pl-2 w-32 text-right font-medium tabular-nums">
                            {formatIDR(sub)}
                          </td>
                          <td className="py-3 pl-2 w-16 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => removeItem(i)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
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
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              {warehouseName}
            </CardTitle>
            <div className="text-xs text-muted-foreground">F4 customer</div>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={(v) => v && setCustomerId(v)}>
                <SelectTrigger className="w-full">
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
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={saleType === "CASH" ? "default" : "outline"}
                  onClick={() => setSaleType("CASH")}
                  className="h-10 justify-between"
                >
                  CASH
                  <span className="text-xs text-muted-foreground">langsung lunas</span>
                </Button>
                <Button
                  variant={saleType === "CREDIT" ? "default" : "outline"}
                  onClick={() => setSaleType("CREDIT")}
                  className="h-10 justify-between"
                >
                  CREDIT
                  <span className="text-xs text-muted-foreground">utang</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium tabular-nums">{formatIDR(subtotal.toNumber())}</span>
            </div>
            <div className="space-y-2">
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
                  className="w-32 text-right border-0 focus:ring-0"
                />
              </div>
              {canDiscount && discountAmount > 0 && (
                <div className="text-[10px] text-destructive ml-auto">
                  Diskon terpakai
                </div>
              )}
            </div>
            <div className="flex justify-between items-baseline gap-2 border-t pt-3">
              <span className="text-lg font-bold">TOTAL</span>
              <span className="text-2xl font-bold text-foreground tabular-nums">
                {formatIDR(total.toNumber())}
              </span>
            </div>

            {saleType === "CASH" ? (
              <div className="space-y-4 pt-3 border-t">
                <div className="space-y-2">
                  <Label>Metode Pembayaran</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "TUNAI" as const, label: "Tunai", icon: Banknote },
                      { value: "TRANSFER" as const, label: "Transfer", icon: CreditCard },
                      { value: "QRIS" as const, label: "QRIS", icon: QrCode },
                      { value: "KARTU" as const, label: "Kartu", icon: CreditCard }
                    ].map((m) => (
                      <Button
                        key={m.value}
                        variant={paymentMethod === m.value ? "default" : "outline"}
                        onClick={() => setPaymentMethod(m.value)}
                        className="h-12 justify-between flex-col"
                      >
                        <m.icon className="h-4 w-4 mb-1" />
                        {m.label}
                      </Button>
                    ))}
                  </div>
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
                    className="text-2xl font-bold text-right w-full border-0 focus:ring-0"
                  />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Kembali</span>
                  <span className="font-semibold tabular-nums">{formatIDR(change.toNumber())}</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {QUICK_PAY_AMOUNTS.map((amt) => (
                    <Button
                      key={amt}
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setPaidAmount(Number(new Decimal(paidAmount).plus(amt).toNumber()))
                      }
                    >
                      {formatIDR(amt)}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPaidAmount(Number(total.toNumber()))
                    }
                  >
                    Uang Pas
                  </Button>
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
              className="w-full h-12 font-bold"
            >
              {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {pending ? "Memproses..." : "BAYAR (F8)"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Result modal */}
      <Dialog open={!!resultModal} onOpenChange={(open) => !open && setResultModal(null)}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle>Penjualan Berhasil</DialogTitle>
            <DialogDescription>
              {resultModal && (
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoice</span>
                    <span className="font-medium">{resultModal.code}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold tabular-nums">
                    <span>Total</span>
                    <span>{formatIDR(resultModal.total)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold tabular-nums">
                    <span>Bayar</span>
                    <span>{formatIDR(resultModal.paid)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-emerald-600 tabular-nums">
                    <span>Kembali</span>
                    <span>{formatIDR(resultModal.change)}</span>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 justify-center">
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
