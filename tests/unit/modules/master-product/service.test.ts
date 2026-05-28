import { describe, it, expect } from "vitest"
import { validateHetCompliance } from "@/modules/master-product/service"
import { AppError } from "@/lib/errors"

describe("validateHetCompliance", () => {
  it("passes when no HET", () => {
    expect(() => validateHetCompliance({ hasHet: false, units: [] }, false)).not.toThrow()
  })

  it("passes when hetPrice is null/undefined", () => {
    expect(() =>
      validateHetCompliance({ hasHet: true, hetPrice: null, units: [] }, false)
    ).not.toThrow()
  })

  it("blocks when sale price per base > HET", () => {
    expect(() =>
      validateHetCompliance(
        {
          hasHet: true,
          hetPrice: 1900,
          units: [{ conversionToBase: 1, salePrice: 2000 }]
        },
        false
      )
    ).toThrow(AppError)
  })

  it("allows when override permission", () => {
    expect(() =>
      validateHetCompliance(
        {
          hasHet: true,
          hetPrice: 1900,
          units: [{ conversionToBase: 1, salePrice: 2000 }]
        },
        true
      )
    ).not.toThrow()
  })

  it("converts unit to base for comparison (pak=20 -> per batang)", () => {
    expect(() =>
      validateHetCompliance(
        {
          hasHet: true,
          hetPrice: 1900,
          units: [{ conversionToBase: 20, salePrice: 35000 }]
        },
        false
      )
    ).not.toThrow()
  })

  it("blocks when only one of multiple units violates", () => {
    expect(() =>
      validateHetCompliance(
        {
          hasHet: true,
          hetPrice: 1900,
          units: [
            { conversionToBase: 1, salePrice: 1800 },
            { conversionToBase: 20, salePrice: 40000 }
          ]
        },
        false
      )
    ).toThrow(AppError)
  })
})
