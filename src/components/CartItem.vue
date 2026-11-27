<script setup>
import ProductImage from './ProductImage.vue'
import { formatPrice, MAX_QTY } from '../utils.js'

// item — послуга з кошика: { id, name, price, image, fallback, qty }
defineProps({
  item: { type: Object, required: true },
})

const emit = defineEmits(['increase', 'decrease', 'remove'])
</script>

<template>
  <li class="cart-item">
    <ProductImage
      class="cart-item__img"
      :src="item.image"
      :fallback="item.fallback"
      :alt="item.name"
    />

    <div class="cart-item__info">
      <h3 class="cart-item__title">{{ item.name }}</h3>
      <p class="muted">{{ formatPrice(item.price) }} / од.</p>
    </div>

    <div class="qty" role="group" :aria-label="`Кількість: ${item.name}`">
      <button
        class="qty__btn"
        type="button"
        aria-label="Зменшити кількість"
        :disabled="item.qty <= 1"
        @click="emit('decrease', item.id)"
      >
        −
      </button>
      <span class="qty__value" aria-live="polite">{{ item.qty }}</span>
      <button
        class="qty__btn"
        type="button"
        aria-label="Збільшити кількість"
        :disabled="item.qty >= MAX_QTY"
        @click="emit('increase', item.id)"
      >
        +
      </button>
    </div>

    <strong class="cart-item__sum">{{ formatPrice(item.price * item.qty) }}</strong>

    <button
      class="icon-btn"
      type="button"
      :aria-label="`Видалити: ${item.name}`"
      @click="emit('remove', item.id)"
    >
      ×
    </button>
  </li>
</template>
