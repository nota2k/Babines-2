import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { openSession, closeSession, currentSession, restoreSession } from '@/services/session.js'

const jsonResponse = (body, status = 200) => ({
  ok: status < 400,
  status,
  json: async () => body,
})

beforeEach(() => {
  closeSession()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('openSession', () => {
  it('poste les identifiants sur _session et retient le nom', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true, name: 'nelly' }))
    vi.stubGlobal('fetch', fetchMock)

    const session = await openSession({ name: 'nelly', password: 'secret' })

    expect(session).toEqual({ name: 'nelly' })
    expect(currentSession()).toEqual({ name: 'nelly' })
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/db/_session')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ name: 'nelly', password: 'secret' })
  })

  it('lève sur des identifiants refusés, sans ouvrir de session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'unauthorized' }, 401)))

    await expect(openSession({ name: 'nelly', password: 'faux' })).rejects.toThrow(/identifiants/i)
    expect(currentSession()).toBeNull()
  })

  it('lève un message lisible quand le réseau est indisponible', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')))

    await expect(openSession({ name: 'nelly', password: 'secret' })).rejects.toThrow(
      /Failed to fetch/,
    )
    expect(currentSession()).toBeNull()
  })
})

describe('restoreSession', () => {
  it('retrouve une session valide et la retient', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ ok: true, userCtx: { name: 'nelly', roles: [] } })),
    )

    const session = await restoreSession()

    expect(session).toEqual({ name: 'nelly' })
    expect(currentSession()).toEqual({ name: 'nelly' })
  })

  it('laisse la session fermée quand le serveur ne connaît personne', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ ok: true, userCtx: { name: null, roles: [] } })),
    )

    const session = await restoreSession()

    expect(session).toBeNull()
    expect(currentSession()).toBeNull()
  })

  it('laisse la session fermée sans lever quand le réseau est indisponible', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')))

    const session = await restoreSession()

    expect(session).toBeNull()
    expect(currentSession()).toBeNull()
  })
})

describe('closeSession', () => {
  it('supprime la session côté serveur et localement', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: true, name: 'nelly' })))
    await openSession({ name: 'nelly', password: 'secret' })

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await closeSession()

    expect(currentSession()).toBeNull()
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE')
  })

  it('oublie la session locale même si le serveur ne répond pas', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: true, name: 'nelly' })))
    await openSession({ name: 'nelly', password: 'secret' })

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')))

    // Ne pas pouvoir joindre le serveur ne doit pas laisser l'utilisateur
    // coincé dans un état « connecté » qu'il ne peut plus quitter.
    await closeSession()
    expect(currentSession()).toBeNull()
  })
})
