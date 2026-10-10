<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch, useTemplateRef } from 'vue';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface AnimatedContentProps {
  distance?: number;
  direction?: 'vertical' | 'horizontal';
  reverse?: boolean;
  duration?: number;
  ease?: string | ((progress: number) => number);
  initialOpacity?: number;
  animateOpacity?: boolean;
  scale?: number;
  threshold?: number;
  delay?: number;
  className?: string;
  respectReducedMotion?: boolean; // true = users with "reduce motion" get a fade only (no movement)
}

const props = withDefaults(defineProps<AnimatedContentProps>(), {
  distance: 100,
  direction: 'vertical',
  reverse: false,
  duration: 0.8,
  ease: 'power3.out',
  initialOpacity: 0,
  animateOpacity: true,
  scale: 1,
  threshold: 0.1,
  delay: 0,
  className: '',
  respectReducedMotion: true
});

const emit = defineEmits<{
  complete: [];
}>();

const containerRef = useTemplateRef<HTMLDivElement>('containerRef');

// Each instance only ever touches ITS OWN tween + ScrollTrigger.
// The old version called ScrollTrigger.getAll().forEach(t => t.kill()), which killed every OTHER
// card's pending animation too. Those cards had already been hidden (opacity 0) and were never
// revealed again → "invisible but clickable" until a refresh.
let tween: gsap.core.Tween | null = null;
let started = false; // true once this card's animation has begun (or finished)

const killOwn = () => {
  tween?.scrollTrigger?.kill();
  tween?.kill();
  tween = null;
};

const setup = () => {
  const el = containerRef.value;
  if (!el) return;

  killOwn();
  started = false;

  // "Reduce motion" (e.g. Windows "Animation effects" turned off): keep a gentle fade, drop the movement/scale
  const reduceMotion =
    props.respectReducedMotion &&
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const axis = props.direction === 'horizontal' ? 'x' : 'y';
  const offset = reduceMotion ? 0 : props.reverse ? -props.distance : props.distance;
  const startPct = (1 - props.threshold) * 100;

  gsap.set(el, {
    [axis]: offset,
    scale: reduceMotion ? 1 : props.scale,
    opacity: props.animateOpacity ? props.initialOpacity : 1
  });

  tween = gsap.to(el, {
    [axis]: 0,
    scale: 1,
    opacity: 1,
    duration: props.duration,
    ease: props.ease,
    delay: props.delay,
    // Remove leftover inline transform/opacity when done (no permanent transform on every card)
    clearProps: 'transform,opacity',
    onStart: () => {
      started = true;
    },
    onComplete: () => {
      started = true;
      emit('complete');
    },
    scrollTrigger: {
      trigger: el,
      start: `top ${startPct}%`,
      toggleActions: 'play none none none',
      once: true
    }
  });
};

onMounted(setup);

// If props change BEFORE the animation started (e.g. the card's index/delay shifted because a new
// item was inserted above it), rebuild only this card. Once it has started/finished, leave it alone:
// re-hiding a card that is already visible would make it vanish or replay.
watch(
  () => [
    props.distance,
    props.direction,
    props.reverse,
    props.duration,
    props.ease,
    props.initialOpacity,
    props.animateOpacity,
    props.scale,
    props.threshold,
    props.delay
  ],
  () => {
    if (started) return;
    setup();
  }
);

onBeforeUnmount(killOwn);
</script>

<template>
  <div ref="containerRef" :class="`animated-content ${props.className}`">
    <slot />
  </div>
</template>

<style scoped>
/* GSAP will handle all transforms and opacity */
</style>