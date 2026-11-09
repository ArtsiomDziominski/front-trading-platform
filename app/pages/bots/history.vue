<script setup lang="ts">
definePageMeta({
  middleware: [
    function redirectBotHistory(to) {
      return navigateTo({ path: useAppPath()('/history'), query: to.query }, { redirectCode: 301 })
    },
  ],
})
</script>
