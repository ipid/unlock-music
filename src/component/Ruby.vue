<template>
  <ruby :title="caption">
    <slot></slot>

    <rp>（</rp>
    <rt v-text="caption"></rt>
    <rp>）</rp>
  </ruby>
</template>

<script>
export default {
  name: 'Ruby',
  props: {
    caption: { type: String, required: true },
  },
};
</script>
