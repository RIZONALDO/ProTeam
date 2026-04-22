export function formatRow<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const formatted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value instanceof Date) {
      formatted[key] = value.toISOString();
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      formatted[key] = formatRow(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      formatted[key] = value.map((item) =>
        item !== null && typeof item === "object" ? formatRow(item as Record<string, unknown>) : item
      );
    } else {
      formatted[key] = value;
    }
  }
  return formatted;
}

export function formatRows<T extends Record<string, unknown>>(rows: T[]): Record<string, unknown>[] {
  return rows.map(formatRow);
}
