// Допоміжні функції, спільні для компонентів.

// Максимальна кількість одного товару в кошику.
export const MAX_QTY = 99

// 9000 -> "9 000 грн"
export function formatPrice(value) {
  return `${Number(value).toLocaleString('uk-UA')} грн`
}

// 2026-12-05 -> "05.12.2026"
export function formatDate(iso) {
  const [y, m, d] = String(iso).split('-')
  return `${d}.${m}.${y}`
}

// Шлях до файлу з теки public з урахуванням base у vite.config.js
export function resolveAsset(path) {
  return `${import.meta.env.BASE_URL}${path}`
}

// Правильна форма слова за українськими правилами:
// pluralize(1, ['товар', 'товари', 'товарів']) -> 'товар'
export function pluralize(n, forms) {
  const abs = Math.abs(n)
  const last = abs % 10
  const lastTwo = abs % 100
  if (last === 1 && lastTwo !== 11) return forms[0]
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return forms[1]
  return forms[2]
}
