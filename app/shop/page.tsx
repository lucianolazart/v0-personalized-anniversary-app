"use client"

import { useMemo, useState, useEffect } from "react"
import { Check, MoreVertical, Plus } from "lucide-react"
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "../lib/firebase"
import type { GroceryAisle, GroceryItem, NewGroceryFormState } from "../types/groceries"
import {
  AISLE_ORDER,
  aisleEmojis,
  aisleNames,
  groupByAisle,
  isGroceryAisle,
  pantryItems,
  toBuyItems,
} from "../lib/groceries"
import { ProductPicker } from "../components/ProductPicker"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const initialFormState: NewGroceryFormState = {
  name: "",
  image: "",
  brand: "",
  barcode: "",
  aisle: "pantry",
  quantity: "",
  notes: "",
  destination: "buy",
  alsoInPantry: false,
}

function mapGrocery(id: string, data: Record<string, unknown>): GroceryItem {
  return {
    id,
    name: typeof data.name === "string" ? data.name : "",
    image: typeof data.image === "string" ? data.image : "",
    brand: typeof data.brand === "string" ? data.brand : undefined,
    barcode: typeof data.barcode === "string" ? data.barcode : undefined,
    aisle: isGroceryAisle(data.aisle) ? data.aisle : "other",
    inPantry: Boolean(data.inPantry),
    needBuy: Boolean(data.needBuy),
    quantity: typeof data.quantity === "string" ? data.quantity : undefined,
    notes: typeof data.notes === "string" ? data.notes : undefined,
  }
}

export default function ShopPage() {
  const [items, setItems] = useState<GroceryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<GroceryItem | null>(null)
  const [view, setView] = useState<"buy" | "pantry">("buy")
  const [aisleFilter, setAisleFilter] = useState<GroceryAisle | "all">("all")
  const [form, setForm] = useState<NewGroceryFormState>(initialFormState)

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "despensa"), (snapshot) => {
      setItems(snapshot.docs.map((item) => mapGrocery(item.id, item.data())))
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const filtered = useMemo(() => {
    return items.filter((item) => aisleFilter === "all" || item.aisle === aisleFilter)
  }, [items, aisleFilter])

  const shoppingList = useMemo(() => toBuyItems(filtered), [filtered])
  const pantry = useMemo(() => pantryItems(filtered), [filtered])
  const shoppingGroups = useMemo(() => groupByAisle(shoppingList), [shoppingList])
  const highlightThumbs = shoppingList.filter((item) => item.image).slice(0, 8)

  const handleOpenDialog = () => {
    setEditingItem(null)
    setForm({
      ...initialFormState,
      destination: view === "pantry" ? "pantry" : "buy",
    })
    setOpen(true)
  }

  const handleCloseDialog = () => {
    setEditingItem(null)
    setForm(initialFormState)
    setOpen(false)
  }

  const handleEdit = (item: GroceryItem) => {
    setEditingItem(item)
    setForm({
      name: item.name,
      image: item.image,
      brand: item.brand ?? "",
      barcode: item.barcode ?? "",
      aisle: item.aisle,
      quantity: item.quantity ?? "",
      notes: item.notes ?? "",
      destination: item.needBuy ? "buy" : "pantry",
      alsoInPantry: item.needBuy && item.inPantry,
    })
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    const needBuy = form.destination === "buy"
    const inPantry = form.destination === "pantry" || form.alsoInPantry
    const payload = {
      name: form.name.trim(),
      image: form.image,
      brand: form.brand.trim() || null,
      barcode: form.barcode.trim() || null,
      aisle: form.aisle,
      quantity: form.quantity.trim() || null,
      notes: form.notes.trim() || null,
      needBuy,
      inPantry,
    }

    try {
      if (editingItem) {
        await updateDoc(doc(db, "despensa", editingItem.id), payload)
      } else {
        await addDoc(collection(db, "despensa"), payload)
      }
      handleCloseDialog()
    } catch (error) {
      console.error("Error saving grocery item:", error)
    }
  }

  const handleBought = async (item: GroceryItem) => {
    try {
      await updateDoc(doc(db, "despensa", item.id), {
        needBuy: false,
        inPantry: true,
      })
    } catch (error) {
      console.error("Error marking item as bought:", error)
    }
  }

  const handleNeedMore = async (item: GroceryItem) => {
    try {
      await updateDoc(doc(db, "despensa", item.id), { needBuy: true })
    } catch (error) {
      console.error("Error marking item as needed:", error)
    }
  }

  const handleDelete = async (item: GroceryItem) => {
    try {
      await deleteDoc(doc(db, "despensa", item.id))
    } catch (error) {
      console.error("Error deleting grocery item:", error)
    }
  }

  const aisleFilters: Array<{ value: GroceryAisle | "all"; label: string; emoji?: string }> = [
    { value: "all", label: "All aisles", emoji: "🛒" },
    ...AISLE_ORDER.map((aisle) => ({
      value: aisle,
      label: aisleNames[aisle],
      emoji: aisleEmojis[aisle],
    })),
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <header className="mb-6 flex items-start justify-between gap-3">
          <h1 className="text-3xl font-serif font-medium text-foreground tracking-tight">
            Shop
          </h1>
          <ThemeToggle />
        </header>

        <div className="mb-6 space-y-2">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
            <button
              onClick={() => setView("buy")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                view === "buy"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              )}
            >
              To buy
            </button>
            <button
              onClick={() => setView("pantry")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                view === "pantry"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              )}
            >
              Pantry
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
            {aisleFilters.map((option) => (
              <button
                key={option.value}
                onClick={() => setAisleFilter(option.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                  aisleFilter === option.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:text-foreground"
                )}
              >
                {option.emoji && <span className="mr-1.5">{option.emoji}</span>}
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <Dialog open={open} onOpenChange={(isOpen) => isOpen ? handleOpenDialog() : handleCloseDialog()}>
          <DialogTrigger asChild>
            <Button className="w-full mb-6" size="lg">
              <Plus className="h-5 w-5 mr-2" />
              New item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-serif font-medium">
                {editingItem ? "Edit item" : "Add item"}
              </DialogTitle>
              <DialogDescription>
                {editingItem
                  ? "Update the product or move it between pantry and the list."
                  : "Search by brand + product, or paste a barcode."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 py-4">
              <div className="grid gap-2">
                <Label htmlFor="grocery-name">Name</Label>
                <Input
                  id="grocery-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="La Serenísima milk, or barcode"
                  className="h-11"
                />
              </div>

              <ProductPicker
                query={form.name}
                image={form.image}
                catalog={items.map((item) => ({
                  name: item.name,
                  brand: item.brand,
                  barcode: item.barcode,
                  image: item.image,
                }))}
                onImageChange={(image) => setForm((current) => ({ ...current, image }))}
                onSelectResult={(result) =>
                  setForm((current) => ({
                    ...current,
                    name: result.name,
                    brand: result.brand || current.brand,
                    barcode: result.barcode,
                    image: result.image,
                  }))
                }
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="grocery-qty">Quantity</Label>
                  <Input
                    id="grocery-qty"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    placeholder="2, 1 kg"
                    className="h-11"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Aisle</Label>
                  <Select
                    value={form.aisle}
                    onValueChange={(value: GroceryAisle) => setForm({ ...form, aisle: value })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select aisle" />
                    </SelectTrigger>
                    <SelectContent>
                      {AISLE_ORDER.map((aisle) => (
                        <SelectItem key={aisle} value={aisle}>
                          {aisleEmojis[aisle]} {aisleNames[aisle]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Where it goes</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, destination: "buy" })}
                    className={cn(
                      "flex-1 h-11 rounded-md border text-sm font-medium",
                      form.destination === "buy"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border"
                    )}
                  >
                    To buy
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, destination: "pantry", alsoInPantry: false })}
                    className={cn(
                      "flex-1 h-11 rounded-md border text-sm font-medium",
                      form.destination === "pantry"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border"
                    )}
                  >
                    Pantry
                  </button>
                </div>
                {form.destination === "buy" && (
                  <label className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                    <Checkbox
                      checked={form.alsoInPantry}
                      onCheckedChange={(checked) => setForm({ ...form, alsoInPantry: checked === true })}
                    />
                    Also in pantry — running low
                  </label>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="grocery-notes">Notes (optional)</Label>
                <Textarea
                  id="grocery-notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Brand, size, aisle tip..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave} disabled={!form.name.trim()}>
                {editingItem ? "Save changes" : "Save item"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted border-t-primary" />
        </div>
      ) : view === "buy" ? (
        <div className="space-y-8 px-4 pb-24 max-w-4xl mx-auto">
          <section>
            {shoppingList.length > 0 ? (
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="p-5 space-y-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-medium">
                    Next up
                  </p>
                  <h2 className="text-2xl font-serif font-medium leading-tight">Shopping run</h2>
                  <p className="text-sm text-muted-foreground">
                    {shoppingList.length} {shoppingList.length === 1 ? "item" : "items"}
                  </p>
                  {highlightThumbs.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
                      {highlightThumbs.map((item) => (
                        <div
                          key={item.id}
                          className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted border border-border"
                        >
                          <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-card/50 px-4 py-10 text-center">
                <p className="font-serif text-xl mb-1">Nothing to buy</p>
                <p className="text-sm text-muted-foreground">
                  Add something you&apos;re out of, or tap Need more from the pantry.
                </p>
              </div>
            )}
          </section>

          {shoppingGroups.map((group) => (
            <section key={group.aisle} className="space-y-3">
              <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
                {aisleEmojis[group.aisle]} {aisleNames[group.aisle]}
              </h3>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <GroceryRow
                    key={item.id}
                    item={item}
                    mode="buy"
                    onBought={handleBought}
                    onNeedMore={handleNeedMore}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : pantry.length === 0 ? (
        <div className="px-4 pb-24 max-w-4xl mx-auto">
          <div className="rounded-lg border border-dashed border-border bg-card/50 px-4 py-10 text-center">
            <p className="font-serif text-xl mb-1">Pantry is empty</p>
            <p className="text-sm text-muted-foreground">
              Add what you already have at home.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-x-2 gap-y-4 px-3 pb-24 max-w-4xl mx-auto">
          {pantry.map((item) => (
            <PantryTile
              key={item.id}
              item={item}
              onNeedMore={handleNeedMore}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function GroceryRow({
  item,
  mode,
  onBought,
  onNeedMore,
  onEdit,
  onDelete,
}: {
  item: GroceryItem
  mode: "buy" | "pantry"
  onBought: (item: GroceryItem) => void
  onNeedMore: (item: GroceryItem) => void
  onEdit: (item: GroceryItem) => void
  onDelete: (item: GroceryItem) => void
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 flex items-center gap-3">
      <button
        type="button"
        onClick={() => mode === "buy" && onBought(item)}
        className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted border border-border relative"
        aria-label={mode === "buy" ? `Mark ${item.name} as bought` : item.name}
      >
        {item.image ? (
          <img src={item.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-lg">
            {aisleEmojis[item.aisle]}
          </span>
        )}
        {mode === "buy" && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/25 transition-colors">
            <Check className="h-5 w-5 text-white opacity-0 hover:opacity-100 drop-shadow" />
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => mode === "buy" && onBought(item)}
        className="min-w-0 flex-1 text-left"
      >
        <p className="font-serif text-base leading-tight">{item.name}</p>
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {[item.quantity, item.brand, item.inPantry ? "also at home" : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </button>
      <ItemMenu
        item={item}
        mode={mode}
        onBought={onBought}
        onNeedMore={onNeedMore}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  )
}

function PantryTile({
  item,
  onNeedMore,
  onEdit,
  onDelete,
}: {
  item: GroceryItem
  onNeedMore: (item: GroceryItem) => void
  onEdit: (item: GroceryItem) => void
  onDelete: (item: GroceryItem) => void
}) {
  return (
    <div className="relative">
      <div className="aspect-square overflow-hidden rounded-md bg-muted border border-border">
        {item.image ? (
          <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-2xl">
            {aisleEmojis[item.aisle]}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-start gap-1">
        <p className="min-w-0 flex-1 text-xs font-medium leading-tight line-clamp-2">
          {item.name}
        </p>
        <ItemMenu
          item={item}
          mode="pantry"
          onBought={() => undefined}
          onNeedMore={onNeedMore}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
      {item.needBuy && (
        <p className="text-[10px] text-primary mt-0.5">Need more</p>
      )}
    </div>
  )
}

function ItemMenu({
  item,
  mode,
  onBought,
  onNeedMore,
  onEdit,
  onDelete,
}: {
  item: GroceryItem
  mode: "buy" | "pantry"
  onBought: (item: GroceryItem) => void
  onNeedMore: (item: GroceryItem) => void
  onEdit: (item: GroceryItem) => void
  onDelete: (item: GroceryItem) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => onEdit(item)}>Edit</DropdownMenuItem>
        {mode === "buy" && (
          <DropdownMenuItem onClick={() => onBought(item)}>Mark bought</DropdownMenuItem>
        )}
        {mode === "pantry" && !item.needBuy && (
          <DropdownMenuItem onClick={() => onNeedMore(item)}>Need more</DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => onDelete(item)}
          className="text-destructive focus:text-destructive"
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
