/** Формат суммы для UI (проекты, продажи и т.д.) */
export function formatMoney(amount: number | null, currency: string): string {
  if (amount == null) {
    return "—";
  }
  return `${amount.toLocaleString("ru-RU")} ${currency}`;
}
