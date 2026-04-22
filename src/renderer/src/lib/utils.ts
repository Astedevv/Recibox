export const currencyBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export const datetimeBR = (iso?: string | null) => {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('pt-BR')
}
