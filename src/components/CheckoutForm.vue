<script setup>
import { reactive, ref, computed } from 'vue'
import { formatPrice } from '../utils.js'

// Форма запису на візит з перевіркою полів.
// total — орієнтовна сума (props), submit — подія з даними клієнта (emit).
defineProps({
  total: { type: Number, required: true },
})

const emit = defineEmits(['submit'])

// Час роботи СТО: щогодини з 09:00 до 17:00
const TIMES = Array.from({ length: 9 }, (_, i) => `${String(9 + i).padStart(2, '0')}:00`)

function toIso(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// Мінімальна дата візиту — сьогодні (у локальному часі)
const today = toIso(new Date())

const form = reactive({
  name: '',
  phone: '',
  car: '',
  date: '',
  time: TIMES[0],
  comment: '',
})

const touched = reactive({ name: false, phone: false, car: false, date: false })
const submitted = ref(false)

// Усі помилки обчислюються автоматично при зміні будь-якого поля.
const errors = computed(() => {
  const result = {}

  const name = form.name.trim()
  if (name.length < 2) {
    result.name = 'Вкажіть ім’я (мінімум 2 літери)'
  } else if (!/^[\p{L}\s'’-]+$/u.test(name)) {
    result.name = 'Ім’я може містити лише літери'
  }

  const digits = form.phone.replace(/\D/g, '')
  if (!/^(380\d{9}|0\d{9})$/.test(digits)) {
    result.phone = 'Введіть номер у форматі +380 50 123 45 67'
  }

  if (form.car.trim().length < 2) {
    result.car = 'Вкажіть марку й модель авто, наприклад Skoda Octavia'
  }

  if (!form.date) {
    result.date = 'Оберіть дату візиту'
  } else if (form.date < today) {
    result.date = 'Дата не може бути в минулому'
  }

  return result
})

function showError(field) {
  return Boolean(errors.value[field]) && (touched[field] || submitted.value)
}

function onSubmit() {
  submitted.value = true
  if (Object.keys(errors.value).length > 0) return

  emit('submit', {
    name: form.name.trim(),
    phone: form.phone.trim(),
    car: form.car.trim(),
    date: form.date,
    time: form.time,
    comment: form.comment.trim(),
  })
}
</script>

<template>
  <form class="form" novalidate @submit.prevent="onSubmit">
    <p class="form__total">
      Орієнтовно до сплати: <strong>{{ formatPrice(total) }}</strong>
    </p>

    <div class="form__row">
      <label class="field" :class="{ 'field--error': showError('name') }">
        <span class="field__label">Ваше ім’я</span>
        <input
          v-model="form.name"
          type="text"
          autocomplete="name"
          placeholder="Іван Петренко"
          :aria-invalid="showError('name')"
          @blur="touched.name = true"
        />
        <span v-if="showError('name')" class="field__error">{{ errors.name }}</span>
      </label>

      <label class="field" :class="{ 'field--error': showError('phone') }">
        <span class="field__label">Номер телефону</span>
        <input
          v-model="form.phone"
          type="tel"
          autocomplete="tel"
          placeholder="+380 50 123 45 67"
          :aria-invalid="showError('phone')"
          @blur="touched.phone = true"
        />
        <span v-if="showError('phone')" class="field__error">{{ errors.phone }}</span>
      </label>
    </div>

    <label class="field" :class="{ 'field--error': showError('car') }">
      <span class="field__label">Марка й модель авто</span>
      <input
        v-model="form.car"
        type="text"
        placeholder="Skoda Octavia, 2015"
        :aria-invalid="showError('car')"
        @blur="touched.car = true"
      />
      <span v-if="showError('car')" class="field__error">{{ errors.car }}</span>
    </label>

    <div class="form__row">
      <label class="field" :class="{ 'field--error': showError('date') }">
        <span class="field__label">Дата візиту</span>
        <input
          v-model="form.date"
          type="date"
          :min="today"
          :aria-invalid="showError('date')"
          @blur="touched.date = true"
        />
        <span v-if="showError('date')" class="field__error">{{ errors.date }}</span>
      </label>

      <label class="field">
        <span class="field__label">Час</span>
        <select v-model="form.time">
          <option v-for="time in TIMES" :key="time" :value="time">{{ time }}</option>
        </select>
      </label>
    </div>

    <label class="field">
      <span class="field__label">Коментар (необов’язково)</span>
      <input v-model="form.comment" type="text" placeholder="Що турбує в авто?" />
    </label>

    <button class="btn btn--primary btn--wide" type="submit">Записатися →</button>
  </form>
</template>
