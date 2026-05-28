"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createCategorySchema, type CreateCategoryInput } from "../schema"
import { createCategoryAction, updateCategoryAction } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ParentOption {
  id: string
  name: string
}

interface Props {
  parentOptions: ParentOption[]
  initial?: { id: string; name: string; parentId: string | null }
}

export function CategoryForm({ parentOptions, initial }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: { name: initial?.name ?? "", parentId: initial?.parentId ?? null }
  })

  function onSubmit(values: CreateCategoryInput) {
    start(async () => {
      const result = initial
        ? await updateCategoryAction({ ...values, id: initial.id })
        : await createCategoryAction(values)
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success(initial ? "Kategori diperbarui" : "Kategori dibuat")
      router.push("/master/categories" as never)
      router.refresh()
    })
  }

  const parentId = watch("parentId")

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
      <div className="space-y-2">
        <Label htmlFor="name">Nama Kategori *</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Parent (opsional)</Label>
        <Select
          value={parentId ?? "_none"}
          onValueChange={(v) => setValue("parentId", v === "_none" ? null : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="(Root)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">(Root)</SelectItem>
            {parentOptions
              .filter((p) => p.id !== initial?.id)
              .map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
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
