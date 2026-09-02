"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { Check, MoreVertical, Plus, Search, ShoppingCart } from "lucide-react"
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "../lib/firebase"
import type { GroceryAisle, GroceryItem, NewGroceryFormState } from "../types/groceries"
import {
  AISLE_ORDER,
  aisleIcons,
  aisleNames,
  aisleForEmoji,
  aisleForProduct,
  emojiForProduct,
  GROCERY_EMOJI_CHOICES,
  isGroceryAisle,
  pantryItems,
  sortByName,
  toBuyItems,
} from "../lib/groceries"
import { GroceryIcon } from "../components/GroceryIcon"
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
  emoji: "",
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
    image: typeof data.image === "string" ? data.image : undefined,
    emoji: typeof data.emoji === "string" ? data.emoji : undefined,
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
  const [search, setSearch] = useState("")
  const [form, setForm] = useState<NewGroceryFormState>(initialFormState)
  const formRef = useRef(form)
  formRef.current = form

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "despensa"), (snapshot) => {
      setItems(snapshot.docs.map((item) => mapGrocery(item.id, item.data())))
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      const matchesAisle = aisleFilter === "all" || item.aisle === aisleFilter
      if (!matchesAisle) return false
      if (!q) return true
      const blob = `${item.name} ${item.notes ?? ""} ${item.quantity ?? ""}`.toLowerCase()
      return blob.includes(q)
    })
  }, [items, aisleFilter, search])

  const shoppingList = useMemo(() => sortByName(toBuyItems(filtered)), [filtered])
  const pantry = useMemo(() => sortByName(pantryItems(filtered)), [filtered])
  const highlightIcons = shoppingList.slice(0, 8)

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
      emoji: item.emoji ?? "",
      aisle: item.aisle,
      quantity: item.quantity ?? "",
      notes: item.notes ?? "",
      destination: item.needBuy ? "buy" : "pantry",
      alsoInPantry: item.needBuy && item.inPantry,
    })
    setOpen(true)
  }

  const handleSave = async () => {
    const current = formRef.current
    if (!current.name.trim()) return
    const needBuy = current.destination === "buy"
    const inPantry = current.destination === "pantry" || current.alsoInPantry
    const customEmoji = current.emoji.trim()
    const payload = {
      name: current.name.trim(),
      image: "",
      brand: null,
      emoji: customEmoji.length > 0 ? customEmoji : null,
      aisle: current.aisle,
      quantity: current.quantity.trim() || null,
      notes: current.notes.trim() || null,
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

  const aisleFilters: Array<{ value: GroceryAisle | "all"; label: string }> = [
    { value: "all", label: "All aisles" },
    ...AISLE_ORDER.map((aisle) => ({
      value: aisle,
      label: aisleNames[aisle],
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
            {aisleFilters.map((option) => {
              const Icon = option.value === "all" ? aisleIcons.other : aisleIcons[option.value]
              return (
                <button
                  key={option.value}
                  onClick={() => setAisleFilter(option.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border inline-flex items-center gap-1.5",
                    aisleFilter === option.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {option.label}
                </button>
              )
            })}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
              className="h-11 pl-9"
            />
          </div>
        </div>

        <Dialog
          open={open}
          onOpenChange={(isOpen) => {
            if (isOpen) setOpen(true)
            else handleCloseDialog()
          }}
        >
          <DialogTrigger asChild>
            <Button className="w-full mb-6" size="lg" onClick={handleOpenDialog}>
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
                  : "Name it, pick an aisle, and choose pantry or to buy."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 py-4">
              <div className="grid gap-2">
                <Label htmlFor="grocery-name">Name</Label>
                <Input
                  id="grocery-name"
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value
                    const guessed = aisleForProduct(name)
                    setForm((current) => ({
                      ...current,
                      name,
                      aisle: !editingItem && guessed ? guessed : current.aisle,
                    }))
                  }}
                  placeholder="Milk, tomatoes, dish soap..."
                  className="h-11"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="grocery-qty">Quantity</Label>
                  <Input
                    id="grocery-qty"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm((current) => ({ ...current, quantity: e.target.value }))
                    }
                    placeholder="2, 1 kg"
                    className="h-11"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Aisle</Label>
                  <Select
                    value={form.aisle}
                    onValueChange={(value: GroceryAisle) =>
                      setForm((current) => ({ ...current, aisle: value }))
                    }
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select aisle" />
                    </SelectTrigger>
                    <SelectContent>
                      {AISLE_ORDER.map((aisle) => {
                        const Icon = aisleIcons[aisle]
                        return (
                          <SelectItem key={aisle} value={aisle}>
                            <span className="inline-flex items-center gap-2">
                              <Icon className="h-3.5 w-3.5" />
                              {aisleNames[aisle]}
                            </span>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Emoji</Label>
                <div className="flex items-center gap-3">
                  <GroceryIcon
                    aisle={form.aisle}
                    name={form.name}
                    emoji={form.emoji || null}
                    size="md"
                  />
                  <p className="text-xs text-muted-foreground flex-1">
                    {form.emoji
                      ? "Custom emoji selected."
                      : emojiForProduct(form.name)
                        ? "Suggested from the name. Pick another if you want."
                        : "No suggestion — pick one or keep the aisle icon."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, emoji: "" }))}
                    className={cn(
                      "h-9 px-2.5 rounded-md border text-xs font-medium",
                      !form.emoji
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Auto
                  </button>
                  {GROCERY_EMOJI_CHOICES.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          emoji,
                          aisle: aisleForEmoji(emoji) ?? current.aisle,
                        }))
                      }
                      className={cn(
                        "h-9 w-9 rounded-md border text-lg leading-none",
                        form.emoji === emoji
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40"
                      )}
                      aria-label={`Choose ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Where it goes</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, destination: "buy" }))}
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
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        destination: "pantry",
                        alsoInPantry: false,
                      }))
                    }
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
                      onCheckedChange={(checked) =>
                        setForm((current) => ({
                          ...current,
                          alsoInPantry: checked === true,
                        }))
                      }
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
                  onChange={(e) =>
                    setForm((current) => ({ ...current, notes: e.target.value }))
                  }
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
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
                    {highlightIcons.map((item) => (
                      <GroceryIcon key={item.id} aisle={item.aisle} name={item.name} emoji={item.emoji} size="md" className="shrink-0" />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-card/50 px-4 py-10 text-center">
                <p className="font-serif text-xl mb-1">{search ? "No matches" : "Nothing to buy"}</p>
                <p className="text-sm text-muted-foreground">
                  {search
                    ? "Try another name."
                    : "Add something you&apos;re out of, or tap Need more from the pantry."}
                </p>
              </div>
            )}
          </section>

          {shoppingList.length > 0 && (
            <div className="space-y-2">
              {shoppingList.map((item) => (
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
          )}
        </div>
      ) : pantry.length === 0 ? (
        <div className="px-4 pb-24 max-w-4xl mx-auto">
          <div className="rounded-lg border border-dashed border-border bg-card/50 px-4 py-10 text-center">
            <p className="font-serif text-xl mb-1">{search ? "No matches" : "Pantry is empty"}</p>
            <p className="text-sm text-muted-foreground">
              {search ? "Try another name." : "Add what you already have at home."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2 px-4 pb-24 max-w-4xl mx-auto">
          {pantry.map((item) => (
            <GroceryRow
              key={item.id}
              item={item}
              mode="pantry"
              onBought={handleBought}
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
        className="relative shrink-0 group"
        aria-label={mode === "buy" ? `Mark ${item.name} as bought` : item.name}
      >
        <GroceryIcon aisle={item.aisle} name={item.name} emoji={item.emoji} size="md" />
        {mode === "buy" && (
          <span className="absolute inset-0 flex items-center justify-center rounded-md bg-black/0 group-hover:bg-black/35 transition-colors">
            <Check className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 drop-shadow transition-opacity" />
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
          {[
            item.quantity,
            mode === "buy" && item.inPantry ? "also at home" : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </button>
      {mode === "buy" && (
        <Button
          type="button"
          size="sm"
          className="shrink-0 h-9"
          onClick={() => onBought(item)}
        >
          <Check className="h-3.5 w-3.5 mr-1.5" />
          Bought
        </Button>
      )}
      {mode === "pantry" && (
        item.needBuy ? (
          <span className="shrink-0 text-xs font-medium text-primary px-2">
            On list
          </span>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0 h-9"
            onClick={() => onNeedMore(item)}
          >
            <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
            To buy
          </Button>
        )
      )}
      <ItemMenu
        item={item}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  )
}

function ItemMenu({
  item,
  onEdit,
  onDelete,
}: {
  item: GroceryItem
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
