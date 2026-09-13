import { beforeEach, expect, it, vi } from 'vitest'
const repository = vi.hoisted(() => ({
  saveManagedIngredient: vi.fn(),
  listManagedIngredients: vi.fn(),
  getManagedIngredient: vi.fn(),
}))
vi.mock('$lib/server/repositories/ingredients', () => repository)
import { POST } from './+server'
import { PUT } from './[id]/+server'
import { load } from './+page.server'
import { load as loadIngredient } from './[id]/+page.server'

const input = {
  name: 'Salt',
  translations: [{ locale: 'CS', name: 'Sůl', aliases: ['  SŮL ', 'sůl'] }],
}
const event = (body: unknown = input, isAdmin = true, id = '5') =>
  ({
    params: { id },
    locals: { user: { id: 7, email: 'admin@example.com', isAdmin } },
    request: { json: async () => body },
    url: new URL('http://localhost/admin/ingredients?q=salt&page=2'),
  }) as any
beforeEach(() => vi.resetAllMocks())

it('protects catalogue pages and writes from non-admin users', async () => {
  for (const handler of [POST, PUT, load, loadIngredient])
    await expect(handler(event(input, false))).rejects.toMatchObject({
      status: 403,
    })
  expect(repository.saveManagedIngredient).not.toHaveBeenCalled()
  expect(repository.listManagedIngredients).not.toHaveBeenCalled()
  expect(repository.getManagedIngredient).not.toHaveBeenCalled()
})

it('rejects unauthenticated writes', async () => {
  await expect(
    POST({ ...event(), locals: { user: null } }),
  ).rejects.toMatchObject({ status: 401 })
})

it('validates input and IDs before persistence', async () => {
  await expect(POST(event(null))).rejects.toMatchObject({ status: 400 })
  for (const id of ['0', '1e2', '2147483648'])
    await expect(PUT(event(input, true, id))).rejects.toMatchObject({
      status: 400,
    })
  expect(repository.saveManagedIngredient).not.toHaveBeenCalled()
})

it('creates and updates normalized locale data', async () => {
  repository.saveManagedIngredient.mockResolvedValue({
    id: 5,
    name: 'Salt',
    translations: {},
  })
  expect((await POST(event())).status).toBe(201)
  expect((await PUT(event())).status).toBe(200)
  expect(repository.saveManagedIngredient).toHaveBeenLastCalledWith(
    {
      name: 'Salt',
      translations: [{ locale: 'cs', name: 'Sůl', aliases: ['sůl'] }],
    },
    5,
  )
})

it('reports missing/private IDs and duplicate names', async () => {
  repository.saveManagedIngredient
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce(false)
    .mockRejectedValueOnce({ cause: { code: '23505' } })
  await expect(PUT(event())).rejects.toMatchObject({ status: 404 })
  await expect(POST(event())).rejects.toMatchObject({ status: 409 })
  await expect(POST(event())).rejects.toMatchObject({ status: 409 })
})

it('loads URL search and pagination and handles missing ingredients', async () => {
  repository.listManagedIngredients.mockResolvedValue({
    ingredients: [],
    totalPages: 1,
    page: 1,
  })
  expect(await load(event())).toMatchObject({
    page: 1,
    totalPages: 1,
    missing: false,
  })
  expect(repository.listManagedIngredients).toHaveBeenCalledWith(
    'salt',
    2,
    false,
  )
  const filtered = event()
  filtered.url.searchParams.set('missing', '1')
  expect(await load(filtered)).toMatchObject({ missing: true })
  expect(repository.listManagedIngredients).toHaveBeenLastCalledWith(
    'salt',
    2,
    true,
  )
  await expect(loadIngredient(event())).rejects.toMatchObject({ status: 404 })
})
