import { describe, expect, it } from 'vitest'
import { inviteStartsSolo, type Invite } from '../domain/lobby'

/** Mirrors useMatch.accept rival selection for head-to-head vs pass-along. */
function rivalsForAccept(invite: Invite): { id: string; name: string }[] {
  if (inviteStartsSolo(invite)) return []
  return [
    {
      id: invite.senderId || invite.hostId,
      name: invite.senderName || invite.hostName,
    },
  ]
}

describe('accept invite rivals', () => {
  it('keeps head-to-head rivals for ordinary matches', () => {
    expect(
      rivalsForAccept({
        gameId: 'g1',
        hostId: 'ada',
        hostName: 'Ada',
        senderId: 'ada',
        senderName: 'Ada',
        board: [['A']],
      }),
    ).toEqual([{ id: 'ada', name: 'Ada' }])
  })

  it('starts a pass-along invitation with no waiting opponent', () => {
    expect(
      rivalsForAccept({
        gameId: 'solo',
        hostId: 'admin',
        hostName: 'Admin',
        senderId: 'admin',
        senderName: 'Admin',
        board: [['A']],
        passAlongSolo: true,
      }),
    ).toEqual([])
  })

  it('uses the forwarder as the rival after Send this board', () => {
    expect(
      rivalsForAccept({
        gameId: 'solo',
        hostId: 'admin',
        hostName: 'Admin',
        senderId: 'grace',
        senderName: 'Grace Hopper',
        board: [['A']],
      }),
    ).toEqual([{ id: 'grace', name: 'Grace Hopper' }])
  })
})
