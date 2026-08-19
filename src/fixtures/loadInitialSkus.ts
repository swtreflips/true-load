import dataCsv from '../../data.csv?raw'
import { parseSkuCsv } from './parseCsv'
import type { SKU } from '../engine/types'

/** The repo-root `data.csv` sample, parsed once at module load. Single source of truth. */
export function loadInitialSkus(): SKU[] {
  return parseSkuCsv(dataCsv)
}
