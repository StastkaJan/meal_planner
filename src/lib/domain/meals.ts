export function mealFitsSlot(allowedSlots: string[], mealType: string) {
  return !allowedSlots.length || allowedSlots.includes(mealType)
}
