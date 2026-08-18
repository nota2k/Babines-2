import { describe, it, expect } from 'vitest'
import { matchKey, stripNoise } from '@/services/normalize.js'

describe('stripNoise', () => {
  it('retire une parenthèse parasite', () => {
    expect(stripNoise('Windowlicker (Official Video)')).toBe('Windowlicker')
  })

  it('retire un suffixe de remaster', () => {
    expect(stripNoise('Creep - Remastered 2011')).toBe('Creep')
  })

  it('retire une mention feat entre parenthèses', () => {
    expect(stripNoise('Get Lucky (feat. Pharrell Williams)')).toBe('Get Lucky')
  })

  it('retire une mention feat sans parenthèses', () => {
    expect(stripNoise('Get Lucky feat. Pharrell Williams')).toBe('Get Lucky')
  })

  it('conserve une parenthèse porteuse de sens', () => {
    expect(stripNoise('Ungawa Pt. II (Way Out Guyana)')).toBe('Ungawa Pt. II (Way Out Guyana)')
  })

  it('conserve un tiret porteur de sens', () => {
    expect(stripNoise('Burning Down the House - I Get Wild')).toBe(
      'Burning Down the House - I Get Wild',
    )
  })
})

describe('matchKey', () => {
  it('minuscule, sans accent, espaces normalisés', () => {
    expect(matchKey('Talking Heads', 'Burning Down  the House')).toBe(
      'talking heads::burning down the house',
    )
  })

  it('retire les accents', () => {
    expect(matchKey('Björk', 'Hyperballad')).toBe('bjork::hyperballad')
  })

  it('rend identiques un titre et sa version remasterisée', () => {
    expect(matchKey('Radiohead', 'Creep - Remastered 2011')).toBe(matchKey('Radiohead', 'Creep'))
  })

  it('retire la ponctuation', () => {
    expect(matchKey('Bob Marley & The Wailers', 'So Much Trouble In The World')).toBe(
      'bob marley the wailers::so much trouble in the world',
    )
  })

  it('sans titre, ne renvoie que l’artiste', () => {
    expect(matchKey('Pulsallama')).toBe('pulsallama')
  })
})
