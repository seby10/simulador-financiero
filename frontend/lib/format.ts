/** Dólares con separadores de Ecuador: `money(10000)` → "$10.000". */
export const money = (value: number, decimals = 0) =>
  "$" +
  value.toLocaleString("es-EC", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
