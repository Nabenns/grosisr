import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import "dayjs/locale/id"

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.locale("id")

const TZ = process.env.APP_TIMEZONE ?? "Asia/Jakarta"

export function nowJakarta(): Date {
  return dayjs().tz(TZ).toDate()
}

export function formatDate(d: Date | string): string {
  return dayjs(d).tz(TZ).format("DD MMM YYYY")
}

export function formatDateTime(d: Date | string): string {
  return dayjs(d).tz(TZ).format("DD MMM YYYY HH:mm")
}

export function formatYearMonth(d: Date | string): string {
  return dayjs(d).tz(TZ).format("YYYYMM")
}
