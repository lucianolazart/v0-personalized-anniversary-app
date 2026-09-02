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
  image: string
  brand?: string
  barcode?: string
  aisle: GroceryAisle
  inPantry: boolean
  needBuy: boolean
  quantity?: string
  notes?: string
}

export type GroceryDestination = "buy" | "pantry"

export interface NewGroceryFormState {
  name: string
  image: string
  brand: string
  barcode: string
  aisle: GroceryAisle
  quantity: string
  notes: string
  destination: GroceryDestination
  alsoInPantry: boolean
}

export interface FoodSearchResult {
  barcode: string
  name: string
  brand: string
  image: string
}

export interface FoodImage {
  url: string
}
