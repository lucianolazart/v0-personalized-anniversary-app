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

export const aisleEmojis: Record<GroceryAisle, string> = {
  produce: "🥬",
  dairy: "🥛",
  meat: "🥩",
  bakery: "🍞",
  pantry: "🫙",
  drinks: "🧃",
  frozen: "🧊",
  household: "🧴",
  other: "🛒",
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

export function toBuyItems(items: GroceryItem[]) {
  return items.filter((item) => item.needBuy)
}

export function pantryItems(items: GroceryItem[]) {
  return items.filter((item) => item.inPantry)
}

export function groupByAisle(items: GroceryItem[]) {
  return AISLE_ORDER
    .map((aisle) => ({
      aisle,
      items: items.filter((item) => item.aisle === aisle),
    }))
    .filter((group) => group.items.length > 0)
}
