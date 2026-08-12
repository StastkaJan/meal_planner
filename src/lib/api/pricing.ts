import { jsonBody, request } from './http'

export const recordPricingInterest = (billingInterval: 'monthly' | 'annual') =>
  request('/pricing/interest', {
    method: 'POST',
    body: jsonBody({ billingInterval }),
  })
