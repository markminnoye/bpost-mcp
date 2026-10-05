import { describe, expect, it } from 'vitest'
import { rolesFromSuggestion, rolesToMapping } from '@/app/(tools)/masspost/poc/columns'

const HEADERS = ['Klantnr', 'Gemeente', 'Postcode', 'Naam', 'Adres', 'Fax']

const SUGGESTION = {
  mapping: {
    name: ['Naam'],
    companyDepartment: [],
    streetHouseBox: ['Adres'],
    postcodeCity: ['Postcode', 'Gemeente'],
    country: [],
  },
  context: ['Klantnr'],
  ignore: ['Fax'],
}

describe('rolesFromSuggestion', () => {
  it('gives every column the role the AI chose', () => {
    const { roles } = rolesFromSuggestion(HEADERS, SUGGESTION)

    expect(roles).toEqual({
      Klantnr: 'context',
      Gemeente: 'postcodeCity',
      Postcode: 'postcodeCity',
      Naam: 'name',
      Adres: 'streetHouseBox',
      Fax: 'ignore',
    })
  })

  it('orders the columns of a block as the AI did, even against the file order', () => {
    const { roles, columnOrder } = rolesFromSuggestion(HEADERS, SUGGESTION)

    expect(rolesToMapping(columnOrder, roles).mapping.postcodeCity).toEqual(['Postcode', 'Gemeente'])
    expect([...columnOrder].sort()).toEqual([...HEADERS].sort())
  })

  it('shows a column the answer does not name while correcting', () => {
    const { roles, columnOrder } = rolesFromSuggestion([...HEADERS, 'Extra'], SUGGESTION)

    expect(roles.Extra).toBe('context')
    expect(columnOrder).toContain('Extra')
  })
})
