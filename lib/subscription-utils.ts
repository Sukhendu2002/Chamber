/**
 * Calculate the next billing date from a start/subscription date and billing cycle.
 * Handles edge cases like Feb 29 on non-leap years and 31st on 30-day months.
 */
export function calculateNextBillingDateFromStart(
  startDate: Date,
  billingCycle: "ONCE" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY"
): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  if (billingCycle === "ONCE") {
    return start;
  }

  if (billingCycle === "WEEKLY") {
    const next = new Date(now);
    const dayOfWeek = start.getDay();
    const diff = (dayOfWeek - next.getDay() + 7) % 7;
    next.setDate(next.getDate() + diff);
    if (next <= now) {
      next.setDate(next.getDate() + 7);
    }
    return next;
  }

  if (billingCycle === "MONTHLY") {
    const targetDay = start.getDate();
    const next = new Date(now.getFullYear(), now.getMonth(), 1);

    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(targetDay, lastDay));

    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
      const nextLastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(targetDay, nextLastDay));
    }
    return next;
  }

  if (billingCycle === "QUARTERLY") {
    const targetDay = start.getDate();
    const targetMonth = start.getMonth();

    let monthOffset = 0;
    while (true) {
      const candidateMonth = ((targetMonth + monthOffset) % 12 + 12) % 12;
      const candidateYear = now.getFullYear() + Math.floor((targetMonth + monthOffset) / 12);
      const candidate = new Date(candidateYear, candidateMonth, 1);
      const lastDay = new Date(candidateYear, candidateMonth + 1, 0).getDate();
      candidate.setDate(Math.min(targetDay, lastDay));

      if (candidate > now) {
        return candidate;
      }
      monthOffset += 3;
    }
  }

  if (billingCycle === "YEARLY") {
    const targetDay = start.getDate();
    const targetMonth = start.getMonth();
    const next = new Date(now.getFullYear(), targetMonth, 1);

    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(targetDay, lastDay));

    if (next <= now) {
      next.setFullYear(next.getFullYear() + 1);
      const nextLastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(targetDay, nextLastDay));
    }
    return next;
  }

  return now;
}
