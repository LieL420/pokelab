import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { TeamsService } from './teams.service'

describe('TeamsService', () => {
  it('does not expose a team that belongs to another user', async () => {
    const prisma = { team: { findFirst: jest.fn().mockResolvedValue(null) } }
    const service = new TeamsService(prisma as never, {} as never)

    await expect(service.get('user-a', 'team-b')).rejects.toBeInstanceOf(NotFoundException)
    expect(prisma.team.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'team-b', ownerId: 'user-a' } }))
  })

  it('rejects duplicated move slots before touching the database', async () => {
    const prisma = { teamPokemon: { findFirst: jest.fn().mockResolvedValue({ id: 'member-1' }) } }
    const service = new TeamsService(prisma as never, {} as never)

    await expect(service.replaceMoves('user-a', 'team-a', 'member-1', { moves: [{ slot: 1, moveId: 10 }, { slot: 1, moveId: 20 }] })).rejects.toBeInstanceOf(UnprocessableEntityException)
  })

  it('maps a position unique constraint to conflict', async () => {
    const tx = {
      team: { findFirst: jest.fn().mockResolvedValue({ id: 'team-a' }) },
      teamPokemon: { count: jest.fn().mockResolvedValue(0), create: jest.fn().mockRejectedValue({ code: 'P2002' }) },
    }
    const prisma = { ...tx, $transaction: jest.fn(async (callback: (transaction: unknown) => Promise<unknown>) => callback(tx)) }
    const pokemon = { resolvePokemon: jest.fn().mockResolvedValue({ speciesId: 25, speciesSlug: 'pikachu', formId: 25, formSlug: 'pikachu', name: 'Pikachu', spriteUrl: null }) }
    const service = new TeamsService(prisma as never, pokemon as never)

    await expect(service.addPokemon('user-a', 'team-a', { position: 1, speciesId: 25 })).rejects.toBeInstanceOf(ConflictException)
  })
})
