import { expect, test } from '@playwright/test'
import { register, uniqueEmail } from './helpers'

test('owner shares plans and recipes with explicit member permission', async ({
  page: owner,
  browser,
}) => {
  const ownerEmail = uniqueEmail()
  const memberEmail = uniqueEmail()
  await register(owner, ownerEmail)
  await owner.getByRole('button', { name: 'Create plan' }).click()
  await owner.goto('/meals')
  await owner.getByRole('button', { name: '+ Add meal' }).click()
  await owner.getByPlaceholder('Meal name').fill('Household soup')
  await owner.getByRole('button', { name: 'Save' }).click()

  const memberContext = await browser.newContext({
    baseURL: 'http://localhost:3000',
  })
  const member = await memberContext.newPage()
  await register(member, memberEmail)

  await owner.goto('/profile')
  await owner.getByLabel('Household name').fill('Our home')
  await owner.getByRole('button', { name: 'Create household' }).click()
  await owner.getByLabel('Registered member email').fill(memberEmail)
  await owner.getByRole('button', { name: 'Add member' }).click()

  await member.goto('/')
  await expect(
    member.getByText('Shared household plan · view only'),
  ).toBeVisible()
  await expect(
    member.getByRole('link', { name: 'Shopping list' }),
  ).toBeVisible()
  await member.goto('/meals')
  await expect(
    member.getByRole('link', { name: 'Household soup' }),
  ).toBeVisible()

  await owner.goto('/profile')
  await owner.getByRole('checkbox', { name: 'Can edit' }).check()
  await member.goto('/')
  await expect(
    member.getByText('Shared household plan · view only'),
  ).toHaveCount(0)

  await memberContext.close()
})
