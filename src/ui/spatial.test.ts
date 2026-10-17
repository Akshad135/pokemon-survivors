import { describe, expect, it } from 'vitest'
import { nearestInDirection, type Box } from './spatial'

const box = (left: number, top: number, width: number, height: number): Box => ({ left, top, width, height })

// A phone lobby: three cards in a row, a wide card under them, JOGAR, then the tab bar.
const cards = [box(10, 100, 100, 60), box(120, 100, 100, 60), box(230, 100, 100, 60)]
const hall = box(10, 180, 320, 50)
const play = box(10, 500, 320, 70)
const tabs = [box(10, 590, 75, 60), box(92, 590, 75, 60), box(174, 590, 75, 60), box(256, 590, 75, 60)]
const phone = [...cards, hall, play, ...tabs]

describe('nearestInDirection', () => {
  it('steps along a row and stops at its ends', () => {
    expect(nearestInDirection(phone, 0, 'right')).toBe(1)
    expect(nearestInDirection(phone, 1, 'left')).toBe(0)
    expect(nearestInDirection(phone, 0, 'left')).toBe(-1)
    expect(nearestInDirection(phone, 2, 'right')).toBe(-1)
  })

  it('goes down through the wide card and JOGAR to the middle of the tab bar', () => {
    expect(nearestInDirection(phone, 2, 'down')).toBe(3)
    expect(nearestInDirection(phone, 3, 'down')).toBe(4)
    expect(nearestInDirection(phone, 4, 'down')).toBe(6)
  })

  it('comes back up to the box right above', () => {
    expect(nearestInDirection(phone, 8, 'up')).toBe(4)
    expect(nearestInDirection(phone, 3, 'up')).toBe(1)
  })

  it('prefers the box straight ahead to a nearer one off to the side', () => {
    const from = box(0, 0, 100, 40)
    const aside = box(300, 60, 100, 40)
    const below = box(0, 200, 100, 40)
    expect(nearestInDirection([from, aside, below], 0, 'down')).toBe(2)
  })

  it('keeps to the row before jumping to a nearer box off it', () => {
    const chip = box(0, 0, 150, 44)
    const card = box(400, 60, 200, 80)
    const gear = box(1200, 0, 44, 44)
    expect(nearestInDirection([chip, card, gear], 0, 'right')).toBe(2)
  })

  it('skips boxes that are not laid out', () => {
    expect(nearestInDirection([box(0, 0, 50, 50), box(60, 0, 0, 0), box(120, 0, 50, 50)], 0, 'right')).toBe(2)
  })
})
