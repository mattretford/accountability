const GBP = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
})

export function formatGBP(amount: number) {
  return GBP.format(amount)
}

export function sumCurrency(amounts: number[]) {
  const pennies = amounts.reduce(
    (total, amount) => total + Math.round(amount * 100),
    0,
  )
  return pennies / 100
}
