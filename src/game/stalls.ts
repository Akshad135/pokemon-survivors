import { STALL_IDS, STALLS, type StallId } from '../data/visitors'
import type { DayKey } from './day'

/** The seasonal stall standing on the plaza on a Brasília `day` (`STALLS`), or null between events. Pure. */
export const stallOn = (day: DayKey): StallId | null => STALL_IDS.find((id) => day >= STALLS[id].from && day <= STALLS[id].to) ?? null
