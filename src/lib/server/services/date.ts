import { error } from '@sveltejs/kit'
import { isDateString } from '$lib/date'

export function validDateStr(value: string) {
  if (!isDateString(value)) error(400, 'Invalid date')
  return value
}
