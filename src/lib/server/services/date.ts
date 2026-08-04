import { error } from '@sveltejs/kit'
import { isDateString } from '$lib/utils/date-time'

export function validDateStr(value: string) {
  if (!isDateString(value)) error(400, 'Invalid date')
  return value
}
