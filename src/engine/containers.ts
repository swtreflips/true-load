import { mm, type ContainerSpec } from './types'

/**
 * 40HC internal usable dimensions. Commonly cited manufacturer figures — NOT verified against
 * a specific carrier's spec sheet. Container dimensions vary by manufacturer and by year
 * (PLAN.md §5): confirm against real carrier specs before this number reaches a planner.
 */
export const CONTAINER_40HC: ContainerSpec = {
  id: '40HC',
  name: "40' High Cube",
  l: mm(12032),
  w: mm(2352),
  h: mm(2698),
  source: 'Commonly cited manufacturer figures — unverified, confirm against carrier specs before production use.',
}

export function theoreticalCapacityMm3(container: ContainerSpec): number {
  return container.l * container.w * container.h
}
