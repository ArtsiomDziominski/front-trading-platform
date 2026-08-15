<script setup lang="ts">
definePageMeta({
  middleware: [
    function redirectBotHistory(to) {
      return navigateTo({ path: '/history', query: to.query }, { redirectCode: 301 })
    },
  ],
})
</script>
