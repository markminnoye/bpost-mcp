import { describe, it, expect } from 'vitest'
import { bpostCredentialsSchema, defaultsSchema, organisationSchema } from '@/lib/tenant/settings-schema'

describe('organisationSchema', () => {
  it('trims the name and refuses an empty one', () => {
    expect(organisationSchema.parse({ name: '  Contrapunt ' })).toEqual({ name: 'Contrapunt' })
    expect(organisationSchema.safeParse({ name: '  ' }).success).toBe(false)
  })
})

describe('defaultsSchema', () => {
  it('accepts the form values and an empty prefix', () => {
    expect(defaultsSchema.parse({ format: 'Large', priority: 'P', genMID: 'N', genPSC: 'Y', codePrefix: '' })).toEqual({
      format: 'Large',
      priority: 'P',
      genMID: 'N',
      genPSC: 'Y',
      codePrefix: '',
    })
  })
  it('treats a missing presort checkbox as N and uppercases the prefix', () => {
    expect(defaultsSchema.parse({ format: 'Small', priority: 'NP', genMID: '7', codePrefix: 'cp' })).toMatchObject({
      genPSC: 'N',
      codePrefix: 'CP',
    })
  })
  it('refuses a prefix with spaces or longer than 8, and an unknown barcode', () => {
    expect(defaultsSchema.safeParse({ format: 'Small', priority: 'NP', genMID: '7', codePrefix: 'C P' }).success).toBe(false)
    expect(defaultsSchema.safeParse({ format: 'Small', priority: 'NP', genMID: '7', codePrefix: 'ABCDEFGHI' }).success).toBe(false)
    expect(defaultsSchema.safeParse({ format: 'Small', priority: 'NP', genMID: '12', codePrefix: '' }).success).toBe(false)
  })
})

describe('bpostCredentialsSchema', () => {
  it('allows an empty password (keep the stored one) and an empty barcode customer id', () => {
    expect(
      bpostCredentialsSchema.parse({ username: 'u', password: '', customerNumber: '12345', accountId: '67890', barcodeCustomerId: '' }),
    ).toEqual({ username: 'u', password: '', customerNumber: '12345', accountId: '67890', barcodeCustomerId: null })
  })
  it('refuses a barcode customer id that is not 5 digits', () => {
    expect(
      bpostCredentialsSchema.safeParse({ username: 'u', password: '', customerNumber: '1', accountId: '2', barcodeCustomerId: '123' })
        .success,
    ).toBe(false)
  })
})

describe('bpostCredentialsSchema, as strict as the former dashboard', () => {
  const base = { username: 'u', password: 'pw', customerNumber: '12345', accountId: '67890', barcodeCustomerId: '' }
  it('accepts 1 to 8 digits for the customer number and the account id, nothing else', () => {
    expect(bpostCredentialsSchema.safeParse({ ...base, customerNumber: 'abc' }).success).toBe(false)
    expect(bpostCredentialsSchema.safeParse({ ...base, accountId: '123456789' }).success).toBe(false)
    expect(bpostCredentialsSchema.safeParse({ ...base, customerNumber: '12345678', accountId: '1' }).success).toBe(true)
  })
  it('trims the password, so only spaces counts as empty', () => {
    expect(bpostCredentialsSchema.parse({ ...base, password: '   ' }).password).toBe('')
  })
})
