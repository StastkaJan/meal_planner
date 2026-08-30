import { expect, test } from '@playwright/test'
import { register, uniqueEmail } from './helpers'

test('owner shares plans and recipes after explicit acceptance', async ({
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
  await owner.getByRole('button', { name: 'Send invitation' }).click()

  await member.goto('/meals')
  await expect(
    member.getByRole('link', { name: 'Household soup' }),
  ).toHaveCount(0)

  await member.goto('/profile')
  await expect(member.getByText('Our home')).toBeVisible()
  await member.getByRole('button', { name: 'Accept' }).click()

  await member.goto('/')
  await expect(
    member.getByText('Shared household plan · view only'),
  ).toBeVisible()
  await expect(
    member.getByRole('button', { name: 'Create plan' }),
  ).toBeVisible()
  await expect(
    member.getByRole('link', { name: 'Shopping list' }),
  ).toBeVisible()
  await member.goto('/meals')
  await expect(
    member.getByRole('link', { name: 'Household soup' }),
  ).toBeVisible()

  await owner.goto('/meals')
  await expect(
    owner.getByRole('row', { name: /Household soup/ }).getByText('Personal'),
  ).toBeVisible()

  await owner.goto('/profile')
  await owner.getByRole('checkbox', { name: 'Can edit' }).check()
  await member.goto('/')
  await expect(
    member.getByText('Shared household plan · view only'),
  ).toHaveCount(0)

  await memberContext.close()
})
