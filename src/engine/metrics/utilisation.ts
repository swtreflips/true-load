import { theoreticalCapacityMm3 } from '../containers'
import type { ContainerState } from '../types'

/**
 * Volume-only utilisation. Not the full theoretical/geometric/loaded split from CLAUDE.md's
 * headline readout — that requires deciding D9 (how "geometric capacity" is defined), which is
 * out of scope for this pass. This is loaded vs. theoretical only, labelled as such in the UI.
 */
export interface Utilisation {
  loadedCbm: number
  theoreticalCbm: number
  utilisationRatio: number
  boxesPlaced: number
  boxesUnplaced: number
}

const MM3_PER_M3 = 1_000_000_000

export function computeUtilisation(state: ContainerState): Utilisation {
  const loadedMm3 = state.boxes.reduce((sum, box) => sum + box.l * box.w * box.h, 0)
  const theoreticalMm3 = theoreticalCapacityMm3(state.container)
  const boxesUnplaced = state.unplaced.reduce((sum, entry) => sum + entry.qty, 0)

  return {
    loadedCbm: loadedMm3 / MM3_PER_M3,
    theoreticalCbm: theoreticalMm3 / MM3_PER_M3,
    utilisationRatio: loadedMm3 / theoreticalMm3,
    boxesPlaced: state.boxes.length,
    boxesUnplaced,
  }
}
