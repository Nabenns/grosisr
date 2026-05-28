"use client"

import {
  Controller,
  useFieldArray,
  type Control,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormWatch,
  type FieldErrors
} from "react-hook-form"
import { Trash2, Plus } from "lucide-react"
import type { CreateProductInput } from "../schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface UnitOption {
  id: string
  name: string
}

interface Props {
  control: Control<CreateProductInput>
  register: UseFormRegister<CreateProductInput>
  setValue: UseFormSetValue<CreateProductInput>
  watch: UseFormWatch<CreateProductInput>
  units: UnitOption[]
  errors: FieldErrors<CreateProductInput>
}

export function ProductUnitsGrid({ control, register, setValue, watch, units, errors }: Props) {
  const { fields, append, remove } = useFieldArray({ control, name: "units" })
  const baseUnitId = watch("baseUnitId")

  function setDefault(name: "isDefaultPurchase" | "isDefaultSale", index: number) {
    fields.forEach((_, i) => setValue(`units.${i}.${name}`, i === index))
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2">
        <div className="col-span-2">Satuan *</div>
        <div className="col-span-2">Konversi *</div>
        <div className="col-span-2">Barcode</div>
        <div className="col-span-2">Harga Beli</div>
        <div className="col-span-2">Harga Jual</div>
        <div className="col-span-1 text-center">Default</div>
        <div className="col-span-1"></div>
      </div>
      {fields.map((f, i) => {
        const unitId = watch(`units.${i}.unitId`)
        const isBase = unitId && unitId === baseUnitId
        return (
          <div key={f.id} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-2">
              <Controller
                control={control}
                name={`units.${i}.unitId`}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                step="0.0001"
                disabled={!!isBase}
                {...register(`units.${i}.conversionToBase`, { valueAsNumber: true })}
              />
            </div>
            <div className="col-span-2">
              <Input {...register(`units.${i}.barcode`)} placeholder="opsional" />
            </div>
            <div className="col-span-2">
              <Input type="number" step="1" {...register(`units.${i}.purchasePrice`, { valueAsNumber: true })} />
            </div>
            <div className="col-span-2">
              <Input type="number" step="1" {...register(`units.${i}.salePrice`, { valueAsNumber: true })} />
            </div>
            <div className="col-span-1 flex flex-col items-center gap-1">
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="radio"
                  name="defBeli"
                  checked={!!watch(`units.${i}.isDefaultPurchase`)}
                  onChange={() => setDefault("isDefaultPurchase", i)}
                />
                Beli
              </label>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="radio"
                  name="defJual"
                  checked={!!watch(`units.${i}.isDefaultSale`)}
                  onChange={() => setDefault("isDefaultSale", i)}
                />
                Jual
              </label>
            </div>
            <div className="col-span-1 text-right">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(i)}
                disabled={fields.length <= 1 || !!isBase}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          append({
            unitId: "",
            conversionToBase: 1,
            barcode: "",
            purchasePrice: 0,
            salePrice: 0,
            isDefaultPurchase: false,
            isDefaultSale: false
          })
        }
      >
        <Plus className="h-4 w-4 mr-1" />
        Tambah Satuan
      </Button>
      {errors.units && (
        <p className="text-sm text-destructive">
          {(errors.units as { message?: string }).message ?? "Periksa pengisian satuan"}
        </p>
      )}
    </div>
  )
}
