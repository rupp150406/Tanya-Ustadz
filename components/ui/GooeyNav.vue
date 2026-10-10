<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

// Usage: <GooeyNav v-model="category" :items="categories" :disabled="isSubmitting" />
// items: [{ id, label, icon, class }]  (icon = Material Symbols name, class = extra tile classes)
const props = defineProps({
  modelValue: { type: String, default: '' },
  items: { type: Array, required: true },
  name: { type: String, default: 'gooey-nav' },
  disabled: { type: Boolean, default: false },
  // lite = phones: no blur/contrast filter and no particles, only a cheap pill pop-in (transform + opacity)
  lite: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const selected = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
})

const selectedItem = computed(
  () => props.items.find(c => c.id === props.modelValue) ?? props.items[0]
)

const gooeyOptions = {
  animationTime: 600,
  particleCount: 15,
  particleDistances: [90, 10],
  particleR: 100,
  timeVariance: 300,
  colors: [1, 2, 3, 1, 2, 3, 1, 4],
}

const gooeyWrapRef = ref(null)        // = containerRef
const gooeyFilterRef = ref(null)      // = filterRef
const gooeyTextRef = ref(null)        // = textRef
const gooeyTintRef = ref(null)        // <feColorMatrix> used to tint the effect
const gooeyColorProbeRef = ref(null)  // reads the real primary color from your theme
const itemEls = {}

const setItemEl = (el, id) => { if (el) itemEls[id] = el }

let gooeyResizeObserver = null
let gooeyThemeObserver = null

const noise = (n = 1) => n / 2 - Math.random() * n

const getXY = (distance, pointIndex, totalPoints) => {
  const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180)
  return [distance * Math.cos(angle), distance * Math.sin(angle)]
}

const createParticle = (i, t, d, r) => {
  const rotate = noise(r / 10)
  return {
    start: getXY(d[0], gooeyOptions.particleCount - i, gooeyOptions.particleCount),
    end: getXY(d[1] + noise(7), gooeyOptions.particleCount - i, gooeyOptions.particleCount),
    time: t,
    scale: 1 + noise(0.2),
    color: gooeyOptions.colors[Math.floor(Math.random() * gooeyOptions.colors.length)],
    rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10,
  }
}

const makeParticles = (element) => {
  const d = gooeyOptions.particleDistances
  const r = gooeyOptions.particleR
  const bubbleTime = gooeyOptions.animationTime * 2 + gooeyOptions.timeVariance
  element.style.setProperty('--time', `${bubbleTime}ms`)
  for (let i = 0; i < gooeyOptions.particleCount; i++) {
    const t = gooeyOptions.animationTime * 2 + noise(gooeyOptions.timeVariance * 2)
    const p = createParticle(i, t, d, r)
    element.classList.remove('active')
    setTimeout(() => {
      const particle = document.createElement('span')
      const point = document.createElement('span')
      particle.classList.add('gooey-particle')
      particle.style.setProperty('--start-x', `${p.start[0]}px`)
      particle.style.setProperty('--start-y', `${p.start[1]}px`)
      particle.style.setProperty('--end-x', `${p.end[0]}px`)
      particle.style.setProperty('--end-y', `${p.end[1]}px`)
      particle.style.setProperty('--time', `${p.time}ms`)
      particle.style.setProperty('--scale', `${p.scale}`)
      particle.style.setProperty('--color', `var(--color-${p.color}, white)`)
      particle.style.setProperty('--rotate', `${p.rotate}deg`)
      point.classList.add('gooey-point')
      particle.appendChild(point)
      element.appendChild(particle)
      requestAnimationFrame(() => {
        element.classList.add('active')
      })
      setTimeout(() => {
        try {
          element.removeChild(particle)
        } catch {}
      }, t)
    }, 30)
  }
}

const updateEffectPosition = (element) => {
  if (!gooeyWrapRef.value || !gooeyFilterRef.value || !gooeyTextRef.value) return
  const containerRect = gooeyWrapRef.value.getBoundingClientRect()
  const pos = element.getBoundingClientRect()
  const styles = {
    left: `${pos.x - containerRect.x}px`,
    top: `${pos.y - containerRect.y}px`,
    width: `${pos.width}px`,
    height: `${pos.height}px`,
  }
  Object.assign(gooeyFilterRef.value.style, styles)
  Object.assign(gooeyTextRef.value.style, styles)
}

// Triggered whenever the selected item changes
const triggerGooey = async () => {
  await nextTick()
  const el = itemEls[props.modelValue]
  if (!el) return
  updateEffectPosition(el)
  if (gooeyFilterRef.value) {
    const particles = gooeyFilterRef.value.querySelectorAll('.gooey-particle')
    particles.forEach(p => gooeyFilterRef.value.removeChild(p))
  }
  if (gooeyTextRef.value) {
    gooeyTextRef.value.classList.remove('active')
    void gooeyTextRef.value.offsetWidth
    gooeyTextRef.value.classList.add('active')
  }
  if (gooeyFilterRef.value) {
    if (props.lite) {
      const f = gooeyFilterRef.value
      f.classList.remove('active')
      void f.offsetWidth
      f.classList.add('active') // triggers the ::after pill animation only
    } else {
      makeParticles(gooeyFilterRef.value)
    }
  }
}

watch(() => props.modelValue, triggerGooey)

// Reads your theme's primary color and feeds it to the tint step of the filter
const syncGooeyTint = () => {
  try {
    const probe = gooeyColorProbeRef.value
    const matrix = gooeyTintRef.value
    if (!probe || !matrix) return
    // plain color for lite mode (no filter to tint it)
    gooeyWrapRef.value?.style.setProperty('--gooey-pill', getComputedStyle(probe).color)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = getComputedStyle(probe).color
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
    matrix.setAttribute(
      'values',
      `0 0 0 0 ${r / 255}  0 0 0 0 ${g / 255}  0 0 0 0 ${b / 255}  0.2126 0.7152 0.0722 0 0`
    )
  } catch {}
}

onMounted(() => {
  syncGooeyTint()
  const activeEl = itemEls[props.modelValue]
  if (activeEl) {
    updateEffectPosition(activeEl)
    gooeyTextRef.value?.classList.add('active')
  }

  // Icon font loading can change tile sizes → re-sync position
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      const el = itemEls[props.modelValue]
      if (el) updateEffectPosition(el)
    })
  }

  gooeyResizeObserver = new ResizeObserver(() => {
    const el = itemEls[props.modelValue]
    if (el) updateEffectPosition(el)
  })
  if (gooeyWrapRef.value) gooeyResizeObserver.observe(gooeyWrapRef.value)

  // Re-read the primary color if the theme (light/dark) changes
  gooeyThemeObserver = new MutationObserver(syncGooeyTint)
  gooeyThemeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] })
})

onBeforeUnmount(() => {
  gooeyResizeObserver?.disconnect()
  gooeyThemeObserver?.disconnect()
})
</script>

<template>
  <!-- Gooey container -->
  <div ref="gooeyWrapRef" class="relative">
    <!-- Tint step for the gooey filter (reads your theme's primary color) -->
    <svg class="absolute w-0 h-0 pointer-events-none" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <filter id="gooey-tint" x="-100%" y="-150%" width="300%" height="400%" color-interpolation-filters="sRGB">
          <feColorMatrix
            ref="gooeyTintRef"
            in="SourceGraphic"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0.41  0 0 0 0 0.28  0.2126 0.7152 0.0722 0 0"
          />
        </filter>
      </defs>
    </svg>
    <span
      ref="gooeyColorProbeRef"
      class="text-primary absolute w-0 h-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    ></span>

    <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
      <label
        v-for="item in items"
        :key="item.id"
        :ref="el => setItemEl(el, item.id)"
        :class="['cursor-pointer group', item.class]"
      >
        <input
          type="radio"
          :name="name"
          :value="item.id"
          v-model="selected"
          class="sr-only peer"
          :disabled="disabled"
        />
        <div class="px-3 py-4 rounded-2xl bg-surface-container-low/80 dark:bg-zinc-800/80 md:backdrop-blur-sm border border-outline-variant/10 dark:border-zinc-700/50 text-center transition-[background-color,color,transform] duration-200 peer-checked:bg-primary peer-checked:text-on-primary hover:bg-surface-container-high dark:hover:bg-zinc-700 group-active:scale-95 flex flex-col items-center justify-center peer-disabled:opacity-50">
          <span class="material-symbols-outlined block mb-1">{{ item.icon }}</span>
          <span class="text-xs font-bold">{{ item.label }}</span>
        </div>
      </label>
    </div>

    <!-- effect filter (pill + particles) -->
    <span
      ref="gooeyFilterRef"
      :class="['gooey-effect', 'gooey-filter', { 'gooey-lite': lite }]"
      :style="{ opacity: disabled ? 0.5 : 1 }"
      aria-hidden="true"
    ></span>

    <!-- effect text (selected icon + label, drawn above the pill) -->
    <div
      ref="gooeyTextRef"
      class="gooey-effect gooey-text [&.active]:text-on-primary"
      :style="{ opacity: disabled ? 0.5 : 1 }"
      aria-hidden="true"
    >
      <span class="material-symbols-outlined block mb-1">{{ selectedItem?.icon }}</span>
      <span class="text-xs font-bold">{{ selectedItem?.label }}</span>
    </div>
  </div>
</template>

<!-- NOT scoped on purpose: particles are created with document.createElement,
     so scoped styles would not reach them. Everything is prefixed with "gooey-". -->
<style>
.gooey-effect {
  position: absolute;
  opacity: 1;
  pointer-events: none;
  display: grid;
  place-items: center;
}

.gooey-effect.gooey-text {
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem 0.75rem;            /* same as the tiles: px-3 py-4 */
  border: 1px solid transparent;    /* same box as the tiles so text overlaps exactly */
  text-align: center;
  transition: color 0.3s ease;
}

.gooey-effect.gooey-filter {
  z-index: 2;
  /* blur(7px) contrast(100) blur(0)  +  tint step (#gooey-tint) */
  filter: blur(7px) contrast(100) blur(0) url(#gooey-tint);
}

.gooey-effect.gooey-filter::before {
  content: '';
  position: absolute;
  inset: -75px;
  z-index: -2;
  background: black;
}

.gooey-effect.gooey-filter::after {
  content: '';
  position: absolute;
  inset: 0;
  background: white;
  transform: scale(0);
  opacity: 0;
  z-index: -1;
  border-radius: 1rem; /* matches the tiles' rounded-2xl */
}

.gooey-effect.gooey-filter.active::after {
  animation: gooey-pill 0.3s ease both;
}

/* Lite mode (phones): no SVG/blur filter, no black backdrop, pill is a plain colored box */
.gooey-effect.gooey-filter.gooey-lite { filter: none; }
.gooey-effect.gooey-filter.gooey-lite::before { display: none; }
.gooey-effect.gooey-filter.gooey-lite::after { background: var(--gooey-pill, #059669); }

@keyframes gooey-pill {
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.gooey-particle,
.gooey-point {
  display: block;
  opacity: 0;
  width: 20px;
  height: 20px;
  border-radius: 9999px;
  transform-origin: center;
}

.gooey-particle {
  --time: 5s;
  position: absolute;
  top: calc(50% - 8px);
  left: calc(50% - 8px);
  animation: gooey-particle calc(var(--time)) ease 1 -350ms;
}

.gooey-point {
  background: var(--color);
  opacity: 1;
  animation: gooey-point calc(var(--time)) ease 1 -350ms;
}

@keyframes gooey-particle {
  0% {
    transform: rotate(0deg) translate(calc(var(--start-x)), calc(var(--start-y)));
    opacity: 1;
    animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45);
  }
  70% {
    transform: rotate(calc(var(--rotate) * 0.5)) translate(calc(var(--end-x) * 1.2), calc(var(--end-y) * 1.2));
    opacity: 1;
    animation-timing-function: ease;
  }
  85% {
    transform: rotate(calc(var(--rotate) * 0.66)) translate(calc(var(--end-x)), calc(var(--end-y)));
    opacity: 1;
  }
  100% {
    transform: rotate(calc(var(--rotate) * 1.2)) translate(calc(var(--end-x) * 0.5), calc(var(--end-y) * 0.5));
    opacity: 1;
  }
}

@keyframes gooey-point {
  0% {
    transform: scale(0);
    opacity: 0;
    animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45);
  }
  25% {
    transform: scale(calc(var(--scale) * 0.25));
  }
  38% {
    opacity: 1;
  }
  65% {
    transform: scale(var(--scale));
    opacity: 1;
    animation-timing-function: ease;
  }
  85% {
    transform: scale(var(--scale));
    opacity: 1;
  }
  100% {
    transform: scale(0);
    opacity: 0;
  }
}
</style>