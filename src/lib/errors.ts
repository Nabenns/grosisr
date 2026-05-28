export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public fields?: Record<string, string>
  ) {
    super(message)
    this.name = "AppError"
  }
}

export const ErrorCode = {
  STOCK_INSUFFICIENT: "STOCK_INSUFFICIENT",
  CREDIT_LIMIT_EXCEEDED: "CREDIT_LIMIT_EXCEEDED",
  HET_VIOLATION: "HET_VIOLATION",
  INVALID_INPUT: "INVALID_INPUT",
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT_VERSION: "CONFLICT_VERSION",
  IDEMPOTENCY_REPLAY: "IDEMPOTENCY_REPLAY",
  INTERNAL: "INTERNAL"
} as const

export type ErrorCodeKey = keyof typeof ErrorCode
