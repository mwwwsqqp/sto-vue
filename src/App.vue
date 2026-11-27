<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import ProductCard from './components/ProductCard.vue'
import CartItem from './components/CartItem.vue'
import CheckoutForm from './components/CheckoutForm.vue'
import { formatPrice, formatDate, pluralize, resolveAsset, MAX_QTY } from './utils.js'

const STORAGE_KEY = 'sto-cart'
const ALL = 'Усі'

// Промокоди: код -> відсоток знижки
const PROMO_CODES = { STO10: 10, NEW5: 5 }

/* ---------- Стан ---------- */

const products = ref([]) // каталог послуг (завантажується з products.json)
const loading = ref(true)
const loadError = ref('')

const search = ref('')
const activeCategory = ref(ALL)
const sortOrder = ref('default')

// Замовлення зберігає лише { id, qty }: ціни й назви беруться з каталогу,
// тому вони завжди актуальні.
function loadSaved() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY))
    const items = Array.isArray(data?.items)
      ? data.items.filter(
          (line) =>
            Number.isInteger(line?.id) &&
            Number.isInteger(line?.qty) &&
            line.qty > 0 &&
            line.qty <= MAX_QTY,
        )
      : []
    const promo = Object.hasOwn(PROMO_CODES, data?.promo) ? data.promo : ''
    return { items, promo }
  } catch {
    return { items: [], promo: '' }
  }
}

const saved = loadSaved()
const cart = ref(saved.items)
const appliedPromo = ref(saved.promo)

const promoInput = ref('')
const promoMessage = ref({ text: '', ok: true })

const order = ref(null) // дані щойно оформленого замовлення
const toast = ref('')
let toastTimer = null

/* ---------- Завантаження каталогу (fetch) ---------- */

async function loadProducts() {
  loading.value = true
  loadError.value = ''
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}products.json`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    if (!Array.isArray(data)) throw new Error('Некоректний формат products.json')
    products.value = data
    // прибираємо із замовлення послуги, яких більше немає в каталозі
    cart.value = cart.value.filter((line) => data.some((p) => p.id === line.id))
  } catch (error) {
    console.error(error)
    loadError.value = 'Не вдалося завантажити перелік послуг. Перевірте з’єднання та спробуйте ще раз.'
  } finally {
    loading.value = false
  }
}

onMounted(loadProducts)
onBeforeUnmount(() => clearTimeout(toastTimer))

/* ---------- Каталог: фільтр, пошук, сортування (computed) ---------- */

const categories = computed(() => [ALL, ...new Set(products.value.map((p) => p.category))])

const filteredProducts = computed(() => {
  const query = search.value.trim().toLowerCase()

  const list = products.value.filter(
    (p) =>
      (activeCategory.value === ALL || p.category === activeCategory.value) &&
      p.name.toLowerCase().includes(query),
  )

  if (sortOrder.value === 'asc') list.sort((a, b) => a.price - b.price)
  if (sortOrder.value === 'desc') list.sort((a, b) => b.price - a.price)
  return list
})

// скільки послуг у кожній категорії (показуємо на кнопках-фільтрах)
function categoryCount(category) {
  return category === ALL
    ? products.value.length
    : products.value.filter((p) => p.category === category).length
}

function resetFilters() {
  search.value = ''
  activeCategory.value = ALL
  sortOrder.value = 'default'
}

/* ---------- Кошик (computed) ---------- */

const qtyById = computed(() => Object.fromEntries(cart.value.map((line) => [line.id, line.qty])))

const cartItems = computed(() =>
  cart.value
    .map((line) => {
      const product = products.value.find((p) => p.id === line.id)
      return product ? { ...product, qty: line.qty } : null
    })
    .filter(Boolean),
)

const cartCount = computed(() => cartItems.value.reduce((sum, item) => sum + item.qty, 0))
const subtotal = computed(() => cartItems.value.reduce((sum, item) => sum + item.price * item.qty, 0))
const discountPercent = computed(() => PROMO_CODES[appliedPromo.value] ?? 0)
const discount = computed(() => Math.round((subtotal.value * discountPercent.value) / 100))
const cartTotal = computed(() => subtotal.value - discount.value)

/* ---------- Дії з кошиком ---------- */

function showToast(message) {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 2200)
}

function addToCart(product) {
  order.value = null
  const line = cart.value.find((l) => l.id === product.id)
  if (line) {
    line.qty = Math.min(line.qty + 1, MAX_QTY)
  } else {
    cart.value.push({ id: product.id, qty: 1 })
  }
  showToast(`Додано: ${product.name}`)
}

function changeQty(id, delta) {
  const line = cart.value.find((l) => l.id === id)
  if (!line) return
  line.qty = Math.min(Math.max(line.qty + delta, 1), MAX_QTY)
}

function removeItem(id) {
  cart.value = cart.value.filter((line) => line.id !== id)
}

function clearCart() {
  cart.value = []
  removePromo()
}

/* ---------- Промокод ---------- */

function applyPromo() {
  const code = promoInput.value.trim().toUpperCase()
  if (!code) {
    promoMessage.value = { text: 'Введіть промокод.', ok: false }
  } else if (Object.hasOwn(PROMO_CODES, code)) {
    appliedPromo.value = code
    promoMessage.value = { text: `Промокод ${code} застосовано: −${PROMO_CODES[code]}%`, ok: true }
    promoInput.value = ''
  } else {
    promoMessage.value = { text: 'Такого промокоду не існує.', ok: false }
  }
}

function removePromo() {
  appliedPromo.value = ''
  promoInput.value = ''
  promoMessage.value = { text: '', ok: true }
}

/* ---------- Оформлення замовлення ---------- */

function placeOrder(customer) {
  order.value = {
    number: Math.floor(100000 + Math.random() * 900000),
    name: customer.name,
    visit: `${formatDate(customer.date)} о ${customer.time}`,
    total: cartTotal.value,
  }
  clearCart()
}

/* ---------- localStorage: зберігаємо кошик при кожній зміні (watch) ---------- */

watch(
  [cart, appliedPromo],
  () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ items: cart.value, promo: appliedPromo.value }),
      )
    } catch {
      // сховище недоступне (приватний режим тощо) — кошик працює без збереження
    }
  },
  { deep: true },
)

const productWord = (n) => pluralize(n, ['послуга', 'послуги', 'послуг'])
</script>

<template>
  <header class="site-header">
    <div class="container site-header__inner">
      <a class="logo" href="#top">
        <span class="logo__mark" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="6" y="6" width="12" height="12" rx="2" />
            <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
          </svg>
        </span>
        Авто<em>Майстер</em>
      </a>
      <nav class="nav" aria-label="Основна навігація">
        <a class="nav__link" href="#catalog">Послуги</a>
        <a class="cart-link" href="#cart">
          Кошик
          <span :key="cartCount" class="badge" aria-live="polite">{{ cartCount }}</span>
        </a>
      </nav>
    </div>
  </header>

  <main>
    <section id="top" class="hero">
      <div class="container hero__inner">
        <div class="hero__content">
          <p class="eyebrow">сервісне обслуговування авто</p>
          <h1>Ваше авто в <em>надійних руках</em></h1>
          <p class="hero__text">
            Діагностика, технічне обслуговування, ремонт ходової й гальм, шиномонтаж. Оберіть
            послуги онлайн і запишіться на зручний час.
          </p>
          <div class="hero__actions">
            <a class="btn btn--primary btn--lg" href="#catalog">Переглянути послуги</a>
            <a class="btn btn--lg" href="#cart">Мій кошик · {{ cartCount }}</a>
          </div>
          <ul class="stats">
            <li>
              <strong>{{ products.length || '—' }}</strong>
              <span>послуг у каталозі</span>
            </li>
            <li>
              <strong>{{ categories.length - 1 || '—' }}</strong>
              <span>категорій</span>
            </li>
            <li>
              <strong>−10%</strong>
              <span>з промокодом STO10</span>
            </li>
          </ul>
        </div>

        <div class="hero__visual" aria-hidden="true">
          <img class="hero__card hero__card--1" :src="resolveAsset('images/computer-diagnostics.svg')" alt="" />
          <img
            class="hero__card hero__card--2"
            :src="resolveAsset('images/timing-belt.svg')"
            alt=""
          />
          <img
            class="hero__card hero__card--3"
            :src="resolveAsset('images/tire-fitting.svg')"
            alt=""
          />
        </div>
      </div>
    </section>

    <section class="features" aria-label="Переваги магазину">
      <div class="container features__grid">
        <div class="feature">
          <span class="feature__icon" aria-hidden="true">🛡️</span>
          <div>
            <h3>Гарантія на роботи</h3>
            <p>6 місяців або 10 000 км гарантії на виконані роботи.</p>
          </div>
        </div>
        <div class="feature">
          <span class="feature__icon" aria-hidden="true">🔧</span>
          <div>
            <h3>Досвідчені майстри</h3>
            <p>Сучасне обладнання та оригінальні або якісні аналогові запчастини.</p>
          </div>
        </div>
        <div class="feature">
          <span class="feature__icon" aria-hidden="true">⏱️</span>
          <div>
            <h3>Чесні терміни</h3>
            <p>Називаємо вартість і час роботи до початку ремонту.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== Каталог ===== -->
    <section id="catalog" class="section">
      <div class="container">
        <p class="eyebrow">каталог</p>
        <div class="section__head">
          <h2>Послуги СТО</h2>
          <p class="muted" aria-live="polite">
            {{ filteredProducts.length }} {{ productWord(filteredProducts.length) }}
          </p>
        </div>
        <p class="muted section__note">
          Ціни орієнтовні (без вартості запчастин), сайт навчальний. Спробуйте промокод <code>STO10</code> у кошику.
        </p>

        <div class="toolbar">
          <label class="field field--search">
            <span class="field__label">Пошук за назвою</span>
            <input v-model="search" type="search" placeholder="Наприклад, масло або гальма" />
          </label>
          <label class="field">
            <span class="field__label">Сортування</span>
            <select v-model="sortOrder">
              <option value="default">За замовчуванням</option>
              <option value="asc">Від дешевших</option>
              <option value="desc">Від дорожчих</option>
            </select>
          </label>
        </div>

        <div class="chips" role="group" aria-label="Категорії">
          <button
            v-for="category in categories"
            :key="category"
            type="button"
            class="chip"
            :class="{ 'chip--active': category === activeCategory }"
            :aria-pressed="category === activeCategory"
            @click="activeCategory = category"
          >
            {{ category }}
            <span class="chip__count">{{ categoryCount(category) }}</span>
          </button>
        </div>

        <p v-if="loading" class="state">Завантаження послуг…</p>

        <div v-else-if="loadError" class="state state--error">
          <h3>Помилка завантаження</h3>
          <p>{{ loadError }}</p>
          <button class="btn" type="button" @click="loadProducts">Спробувати ще раз</button>
        </div>

        <div v-else-if="filteredProducts.length === 0" class="state">
          <div class="state__icon" aria-hidden="true">⌕</div>
          <h3>Нічого не знайдено</h3>
          <p>Спробуйте іншу назву або оберіть іншу категорію.</p>
          <button class="btn" type="button" @click="resetFilters">Скинути фільтри</button>
        </div>

        <TransitionGroup v-else name="list" tag="div" class="grid">
          <ProductCard
            v-for="product in filteredProducts"
            :key="product.id"
            :product="product"
            :in-cart="qtyById[product.id] ?? 0"
            @add="addToCart"
          />
        </TransitionGroup>
      </div>
    </section>

    <!-- ===== Кошик ===== -->
    <section id="cart" class="section section--alt">
      <div class="container">
        <p class="eyebrow">ваш кошик</p>
        <div class="section__head">
          <h2>Кошик · {{ cartCount }}</h2>
          <button v-if="cartItems.length" class="btn btn--ghost" type="button" @click="clearCart">
            Очистити
          </button>
        </div>

        <p v-if="loading || loadError" class="state">
          Кошик буде доступний після завантаження каталогу.
        </p>

        <div v-else-if="cartItems.length === 0" class="state">
          <div class="state__icon" aria-hidden="true">🛒</div>
          <h3>Кошик ще порожній</h3>
          <p>Оберіть потрібні послуги — вони з’являться тут.</p>
          <a class="btn" href="#catalog">До послуг</a>
        </div>

        <div v-else class="cart-layout">
          <TransitionGroup name="list" tag="ul" class="cart-list">
            <CartItem
              v-for="item in cartItems"
              :key="item.id"
              :item="item"
              @increase="changeQty($event, 1)"
              @decrease="changeQty($event, -1)"
              @remove="removeItem"
            />
          </TransitionGroup>

          <aside class="summary" aria-label="Підсумок замовлення">
            <div class="summary__row">
              <span>Послуг</span>
              <span>{{ cartCount }}</span>
            </div>
            <div class="summary__row">
              <span>Сума</span>
              <span>{{ formatPrice(subtotal) }}</span>
            </div>
            <div v-if="discountPercent" class="summary__row summary__row--discount">
              <span>Знижка ({{ discountPercent }}%)</span>
              <span>−{{ formatPrice(discount) }}</span>
            </div>
            <div class="summary__row summary__row--total">
              <span>Разом</span>
              <strong>{{ formatPrice(cartTotal) }}</strong>
            </div>

            <form class="promo" @submit.prevent="applyPromo">
              <label class="field">
                <span class="field__label">Промокод</span>
                <span class="promo__row">
                  <input v-model="promoInput" type="text" placeholder="STO10" autocomplete="off" />
                  <button class="btn" type="submit">Застосувати</button>
                </span>
              </label>
              <p
                v-if="promoMessage.text"
                class="promo__msg"
                :class="{ 'promo__msg--error': !promoMessage.ok }"
                role="status"
              >
                {{ promoMessage.text }}
              </p>
              <button v-if="appliedPromo" class="link-btn" type="button" @click="removePromo">
                Прибрати промокод {{ appliedPromo }}
              </button>
            </form>
          </aside>
        </div>
      </div>
    </section>

    <!-- ===== Оформлення замовлення ===== -->
    <section v-if="cartItems.length || order" id="checkout" class="section">
      <div class="container container--narrow">
        <div v-if="order" class="success" role="status">
          <h2>Дякуємо, {{ order.name }}!</h2>
          <p>
            Запис № {{ order.number }} на суму <strong>{{ formatPrice(order.total) }}</strong>
            прийнято. Чекаємо на вас {{ order.visit }}. Адміністратор зателефонує для підтвердження.
          </p>
          <button class="btn" type="button" @click="order = null">Закрити</button>
        </div>

        <template v-else>
          <p class="eyebrow">майже готово</p>
          <h2 class="section__title">Запис на візит</h2>
          <CheckoutForm :total="cartTotal" @submit="placeOrder" />
        </template>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container site-footer__inner">
      <span class="logo logo--small">Авто<em>Майстер</em></span>
      <span>© 2026 АвтоМайстер. Навчальний проєкт, ціни орієнтовні.</span>
    </div>
  </footer>

  <Transition name="toast">
    <div v-if="toast" class="toast" role="status">{{ toast }}</div>
  </Transition>
</template>
