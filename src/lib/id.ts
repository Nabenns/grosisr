export function generateCode(prefix: string, sequence: number, ym: string): string {
  return `${prefix}-${ym}-${String(sequence).padStart(4, "0")}`
}

export function generateMasterCode(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(5, "0")}`
}
