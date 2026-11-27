<script setup>
import { ref, computed, watch } from 'vue'
import { resolveAsset } from '../utils.js'

// Зображення з запасним варіантом: якщо фото не завантажилось
// (файлу немає в public/images), показується запасна SVG-ілюстрація.
const props = defineProps({
  src: { type: String, required: true },
  fallback: { type: String, default: '' },
  alt: { type: String, default: '' },
})

const failed = ref(false)

const url = computed(() =>
  resolveAsset(failed.value && props.fallback ? props.fallback : props.src),
)

function onError() {
  if (props.fallback) failed.value = true
}

watch(
  () => props.src,
  () => {
    failed.value = false
  },
)
</script>

<template>
  <img :src="url" :alt="alt" loading="lazy" @error="onError" />
</template>
