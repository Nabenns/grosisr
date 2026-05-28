"use client"

import { useTransition, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createProductSchema, type CreateProductInput } from "../schema"
import { createProductAction, updateProductAction } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProductUnitsGrid } from "./product-units-grid"

interface CategoryOption {
  id: string
  name: string
}
interface BrandOption {
  id: string
  name: string
}
interface UnitOption {
  id: string
  name: string
}

interface InitialProduct extends CreateProductInput {
  id: string
  version: number
}

interface Props {
  categories: CategoryOption[]
  brands: BrandOption[]
  units: UnitOption[]
  initial?: InitialProduct
}

export function ProductForm({ categories, brands, units, initial }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const form = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema),
    defaultValues: initial ?? {
      sku: "",
      name: "",
      categoryId: "",
      brandId: null,
      baseUnitId: "",
      description: null,
      imageUrl: null,
      hasCukai: false,
      hasHet: false,
      hetPrice: null,
      minStock: 0,
      units: [
        {
          unitId: "",
          conversionToBase: 1,
          barcode: null,
          purchasePrice: 0,
          salePrice: 0,
          isDefaultPurchase: true,
          isDefaultSale: true
        }
      ]
    }
  })
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors }
  } = form
  const baseUnitId = watch("baseUnitId")
  const hasHet = watch("hasHet")
  const u0Id = watch("units.0.unitId")

  // Auto-sync first unit's unitId with baseUnitId on first load if empty
  useEffect(() => {
    if (baseUnitId && !u0Id) {
      setValue("units.0.unitId", baseUnitId)
      setValue("units.0.conversionToBase", 1)
    }
  }, [baseUnitId, u0Id, setValue])

  function onSubmit(values: CreateProductInput) {
    start(async () => {
      const result = initial
        ? await updateProductAction({ ...values, id: initial.id, version: initial.version })
        : await createProductAction(values)
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success(initial ? "Produk diperbarui" : "Produk dibuat")
      router.push("/master/products" as never)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-5xl">
      <Card>
        <CardHeader>
          <CardTitle>Informasi Dasar</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sku">SKU *</Label>
            <Input id="sku" {...register("sku")} />
            {errors.sku && <p className="text-sm text-destructive">{errors.sku.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nama Produk *</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Kategori *</Label>
            <Select
              value={watch("categoryId") ?? ""}
              onValueChange={(v) => v && setValue("categoryId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Brand</Label>
            <Select
              value={watch("brandId") ?? "_none"}
              onValueChange={(v) => setValue("brandId", v === "_none" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="(Tidak ada)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">(Tidak ada)</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Base Unit *</Label>
            <Select
              value={baseUnitId ?? ""}
              onValueChange={(v) => v && setValue("baseUnitId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih satuan dasar" />
              </SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Satuan terkecil produk (mis. batang/pcs)
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="minStock">Stok Minimum (base unit)</Label>
            <Input id="minStock" type="number" {...register("minStock", { valueAsNumber: true })} />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea id="description" {...register("description")} rows={3} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Satuan & Harga</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductUnitsGrid
            control={control}
            register={register}
            setValue={setValue}
            watch={watch}
            units={units}
            errors={errors}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cukai & HET</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={watch("hasCukai")} onCheckedChange={(v) => setValue("hasCukai", v)} />
            <Label>Produk kena cukai</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={hasHet} onCheckedChange={(v) => setValue("hasHet", v)} />
            <Label>Punya HET</Label>
          </div>
          {hasHet && (
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="hetPrice">HET (per base unit) *</Label>
              <Input
                id="hetPrice"
                type="number"
                step="1"
                {...register("hetPrice", { valueAsNumber: true })}
              />
              {errors.hetPrice && (
                <p className="text-sm text-destructive">{errors.hetPrice.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Harga jual semua satuan otomatis dicek vs HET (kecuali kamu punya permission override)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Batal
        </Button>
      </div>
    </form>
  )
}
