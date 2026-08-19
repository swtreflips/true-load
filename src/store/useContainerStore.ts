import { create } from 'zustand'
import { pack } from '../engine/packers/shelfPacker'
import { CONTAINER_40HC } from '../engine/containers'
import { computeUtilisation, type Utilisation } from '../engine/metrics/utilisation'
import { loadInitialSkus } from '../fixtures/loadInitialSkus'
import type { ContainerState, SKU, Violation } from '../engine/types'

interface ContainerStoreState {
  skus: SKU[]
  containerState: ContainerState
  violations: Violation[]
  utilisation: Utilisation
}

function computeInitialState(): ContainerStoreState {
  const skus = loadInitialSkus()
  const { state, violations } = pack(skus, CONTAINER_40HC)
  return {
    skus,
    containerState: state,
    violations,
    utilisation: computeUtilisation(state),
  }
}

// No re-pack triggers yet: SKU inputs aren't editable in this pass, so the store initialises
// once from data.csv and holds the result. Wiring an editable SKU grid back into pack() is the
// natural next step once this skeleton is verified.
export const useContainerStore = create<ContainerStoreState>(() => computeInitialState())
