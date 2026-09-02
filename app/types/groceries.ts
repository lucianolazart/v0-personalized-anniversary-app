export type GroceryAisle =
  | "produce"
  | "dairy"
  | "meat"
  | "bakery"
  | "pantry"
  | "drinks"
  | "frozen"
  | "household"
  | "other"

export interface GroceryItem {
  id: string
  name: string
  image?: string
  emoji?: string
  aisle: GroceryAisle
  inPantry: boolean
  needBuy: boolean
  quantity?: string
  notes?: string
}

export type GroceryDestination = "buy" | "pantry"

export interface NewGroceryFormState {
  name: string
  emoji: string
  aisle: GroceryAisle
  quantity: string
  notes: string
  destination: GroceryDestination
  alsoInPantry: boolean
}
