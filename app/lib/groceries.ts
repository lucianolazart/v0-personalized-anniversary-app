import type { LucideIcon } from "lucide-react"
import {
  Apple,
  Beef,
  Croissant,
  CupSoda,
  Milk,
  Package,
  ShoppingBasket,
  Snowflake,
  SprayCan,
} from "lucide-react"
import type { GroceryAisle, GroceryItem } from "../types/groceries"

export const AISLE_ORDER: GroceryAisle[] = [
  "produce",
  "dairy",
  "meat",
  "bakery",
  "pantry",
  "drinks",
  "frozen",
  "household",
  "other",
]

export const aisleIcons: Record<GroceryAisle, LucideIcon> = {
  produce: Apple,
  dairy: Milk,
  meat: Beef,
  bakery: Croissant,
  pantry: Package,
  drinks: CupSoda,
  frozen: Snowflake,
  household: SprayCan,
  other: ShoppingBasket,
}

export const aisleNames: Record<GroceryAisle, string> = {
  produce: "Produce",
  dairy: "Dairy",
  meat: "Meat",
  bakery: "Bakery",
  pantry: "Pantry",
  drinks: "Drinks",
  frozen: "Frozen",
  household: "Household",
  other: "Other",
}

export function isGroceryAisle(value: unknown): value is GroceryAisle {
  return typeof value === "string" && (AISLE_ORDER as string[]).includes(value)
}

export function sortByName(items: GroceryItem[]) {
  return [...items].sort((a, b) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" })
  )
}

function normalizeProduct(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

type ProductGlyph = { keys: string[]; emoji: string; aisle: GroceryAisle }

const PRODUCT_GLYPHS: ProductGlyph[] = [
  { keys: ["aceite de oliva", "olive oil", "oliva"], emoji: "🫒", aisle: "pantry" },
  { keys: ["aceite"], emoji: "🫗", aisle: "pantry" },
  { keys: ["leche", "milk"], emoji: "🥛", aisle: "dairy" },
  { keys: ["yogurt", "yogur", "yoghurt"], emoji: "🥣", aisle: "dairy" },
  { keys: ["queso", "cheese", "muzzarella", "mozzarella", "cremoso"], emoji: "🧀", aisle: "dairy" },
  { keys: ["manteca", "mantequilla", "butter"], emoji: "🧈", aisle: "dairy" },
  { keys: ["huevo", "egg"], emoji: "🥚", aisle: "dairy" },
  { keys: ["pan", "bread", "lactal", "baguette"], emoji: "🍞", aisle: "bakery" },
  { keys: ["factura", "medialuna", "croissant"], emoji: "🥐", aisle: "bakery" },
  { keys: ["galleta", "cookie", "cracker"], emoji: "🍪", aisle: "bakery" },
  { keys: ["arroz", "rice"], emoji: "🍚", aisle: "pantry" },
  { keys: ["fideo", "pasta", "spaghetti", "ñoqui", "ñoquis"], emoji: "🍝", aisle: "pantry" },
  { keys: ["harina", "flour"], emoji: "🌾", aisle: "pantry" },
  { keys: ["azucar", "sugar"], emoji: "🍬", aisle: "pantry" },
  { keys: ["sal", "salt"], emoji: "🧂", aisle: "pantry" },
  { keys: ["cafe", "coffee"], emoji: "☕", aisle: "drinks" },
  { keys: ["te", "tea"], emoji: "🍵", aisle: "drinks" },
  { keys: ["agua", "water"], emoji: "💧", aisle: "drinks" },
  { keys: ["jugo", "juice", "gaseosa", "soda", "coca", "sprite"], emoji: "🥤", aisle: "drinks" },
  { keys: ["vino", "wine"], emoji: "🍷", aisle: "drinks" },
  { keys: ["cerveza", "beer"], emoji: "🍺", aisle: "drinks" },
  { keys: ["tomate", "tomato"], emoji: "🍅", aisle: "produce" },
  { keys: ["cebolla", "onion"], emoji: "🧅", aisle: "produce" },
  { keys: ["ajo", "garlic"], emoji: "🧄", aisle: "produce" },
  { keys: ["papa", "patata", "potato"], emoji: "🥔", aisle: "produce" },
  { keys: ["zanahoria", "carrot"], emoji: "🥕", aisle: "produce" },
  { keys: ["lechuga", "lettuce", "ensalada"], emoji: "🥬", aisle: "produce" },
  { keys: ["palta", "aguacate", "avocado"], emoji: "🥑", aisle: "produce" },
  { keys: ["banana", "banano", "platano"], emoji: "🍌", aisle: "produce" },
  { keys: ["manzana", "apple"], emoji: "🍎", aisle: "produce" },
  { keys: ["naranja", "orange"], emoji: "🍊", aisle: "produce" },
  { keys: ["limon", "lemon", "lima"], emoji: "🍋", aisle: "produce" },
  { keys: ["frutilla", "fresa", "strawberry"], emoji: "🍓", aisle: "produce" },
  { keys: ["uva", "grape"], emoji: "🍇", aisle: "produce" },
  { keys: ["pollo", "chicken"], emoji: "🐔", aisle: "meat" },
  { keys: ["carne", "beef", "vacuno", "nalga", "asado"], emoji: "🥩", aisle: "meat" },
  { keys: ["cerdo", "pork", "jamon", "bacon", "panceta"], emoji: "🥓", aisle: "meat" },
  { keys: ["pescado", "fish", "atun", "salmon", "merluza"], emoji: "🐟", aisle: "meat" },
  { keys: ["helado", "ice cream"], emoji: "🍦", aisle: "frozen" },
  { keys: ["congelad", "frozen", "nugget"], emoji: "🧊", aisle: "frozen" },
  { keys: ["pizza"], emoji: "🍕", aisle: "frozen" },
  { keys: ["chocolate"], emoji: "🍫", aisle: "pantry" },
  { keys: ["miel", "honey"], emoji: "🍯", aisle: "pantry" },
  { keys: ["mermelada", "jam", "dulce de leche"], emoji: "🍯", aisle: "pantry" },
  { keys: ["mayonesa", "ketchup", "mostaza", "aderezo"], emoji: "🫙", aisle: "pantry" },
  { keys: ["jabon", "detergente", "limpiador", "lavandina", "soap"], emoji: "🧼", aisle: "household" },
  { keys: ["papel higienico", "servilleta", "tissue"], emoji: "🧻", aisle: "household" },
  { keys: ["esponja", "bolsa", "foil", "film"], emoji: "🧽", aisle: "household" },
]

const GLYPHS_BY_LENGTH = [...PRODUCT_GLYPHS].sort(
  (a, b) => Math.max(...b.keys.map((key) => key.length)) - Math.max(...a.keys.map((key) => key.length))
)

function productTokens(value: string) {
  return normalizeProduct(value).split(/[^a-z0-9]+/).filter(Boolean)
}

function nameMatchesKey(haystack: string, key: string) {
  const needle = normalizeProduct(key)
  if (!needle) return false
  if (needle.includes(" ") || needle.length >= 5) return haystack.includes(needle)
  return productTokens(haystack).includes(needle)
}

function findGlyph(name: string) {
  const haystack = normalizeProduct(name)
  if (!haystack) return null
  return GLYPHS_BY_LENGTH.find((glyph) =>
    glyph.keys.some((key) => nameMatchesKey(haystack, key))
  ) ?? null
}

export function emojiForProduct(name: string) {
  return findGlyph(name)?.emoji ?? null
}

export function aisleForProduct(name: string): GroceryAisle | null {
  return findGlyph(name)?.aisle ?? null
}

const EXTRA_EMOJI_AISLES: Record<string, GroceryAisle> = {
  "🛒": "other",
  "📦": "pantry",
  "🧴": "household",
  "🧊": "frozen",
  "🥜": "pantry",
  "🌽": "produce",
  "🥦": "produce",
  "🍄": "produce",
  "🌮": "other",
  "🍱": "other",
  "🥗": "produce",
  "🧃": "drinks",
  "🧉": "drinks",
  "🪥": "household",
  "🧹": "household",
}

const EMOJI_TO_AISLE: Record<string, GroceryAisle> = {
  ...EXTRA_EMOJI_AISLES,
  ...Object.fromEntries(PRODUCT_GLYPHS.map((glyph) => [glyph.emoji, glyph.aisle])),
}

export function aisleForEmoji(emoji: string): GroceryAisle | null {
  return EMOJI_TO_AISLE[emoji] ?? null
}

export const GROCERY_EMOJI_CHOICES = Array.from(
  new Set([
    ...PRODUCT_GLYPHS.map((glyph) => glyph.emoji),
    "🛒",
    "📦",
    "🧴",
    "🧊",
    "🥜",
    "🌽",
    "🥦",
    "🍄",
    "🌮",
    "🍱",
    "🥗",
    "🧃",
    "🧉",
    "🪥",
    "🧹",
  ])
)

export function resolveGroceryEmoji(name: string, custom?: string | null) {
  const trimmed = typeof custom === "string" ? custom.trim() : ""
  if (trimmed.length > 0) return trimmed
  return emojiForProduct(name)
}

export function toBuyItems(items: GroceryItem[]) {
  return items.filter((item) => item.needBuy)
}

export function pantryItems(items: GroceryItem[]) {
  return items.filter((item) => item.inPantry)
}
