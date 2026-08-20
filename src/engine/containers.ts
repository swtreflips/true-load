import { mm, type ContainerSpec } from './types'

/**
 * Internal usable dimensions for the standard ISO dry container library (CLAUDE.md/PLAN.md table
 * stakes: "container picker with a real library, 20GP/40GP/40HC"). All figures are commonly
 * cited manufacturer numbers — NOT verified against a specific carrier's spec sheet. Container
 * dimensions vary by manufacturer and by year (PLAN.md §5): confirm against real carrier specs
 * before any of these numbers reach a planner.
 */
const UNVERIFIED_SOURCE =
  'Commonly cited manufacturer figures — unverified, confirm against carrier specs before production use.'

export const CONTAINER_20GP: ContainerSpec = {
  id: '20GP',
  name: "20' General Purpose",
  l: mm(5898),
  w: mm(2352),
  h: mm(2393),
  source: UNVERIFIED_SOURCE,
}

export const CONTAINER_40GP: ContainerSpec = {
  id: '40GP',
  name: "40' General Purpose",
  l: mm(12032),
  w: mm(2352),
  h: mm(2393),
  source: UNVERIFIED_SOURCE,
}

export const CONTAINER_40HC: ContainerSpec = {
  id: '40HC',
  name: "40' High Cube",
  l: mm(12032),
  w: mm(2352),
  h: mm(2698),
  source: UNVERIFIED_SOURCE,
}

export const ALL_CONTAINERS: ContainerSpec[] = [CONTAINER_20GP, CONTAINER_40GP, CONTAINER_40HC]

export function theoreticalCapacityMm3(container: ContainerSpec): number {
  return container.l * container.w * container.h
}
