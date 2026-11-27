<script setup>
import ProductImage from './ProductImage.vue'
import { formatPrice } from '../utils.js'

// Дані — через props, дії — через події (emit).
defineProps({
  product: { type: Object, required: true },
  inCart: { type: Number, default: 0 },
})

const emit = defineEmits(['add'])
</script>

<template>
  <article class="card">
    <div class="card__media">
      <span v-if="product.badge" class="card__badge">{{ product.badge }}</span>
      <ProductImage :src="product.image" :fallback="product.fallback" :alt="product.name" />
    </div>
    <div class="card__body">
      <span class="card__category">{{ product.category }}</span>
      <h3 class="card__title">{{ product.name }}</h3>
      <p class="card__specs">{{ product.specs }}</p>
      <div class="card__footer">
        <strong class="card__price">{{ formatPrice(product.price) }}</strong>
        <button class="btn btn--primary" type="button" @click="emit('add', product)">
          {{ inCart ? `У кошику · ${inCart}` : 'До кошика' }}
        </button>
      </div>
    </div>
  </article>
</template>
