import { AppError } from "./errors"
import { logger } from "./logger"

export type ActionResult<T> =
  | { success: true; data: T }
  | {
      success: false
      error: { code: string; message: string; fields?: Record<string, string> }
    }

export async function action<T>(handler: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await handler()
    return { success: true, data }
  } catch (e) {
    if (e instanceof AppError) {
      return {
        success: false,
        error: { code: e.code, message: e.message, fields: e.fields }
      }
    }
    logger.error({ err: e }, "Unhandled action error")
    return {
      success: false,
      error: { code: "INTERNAL", message: "Terjadi kesalahan internal" }
    }
  }
}
