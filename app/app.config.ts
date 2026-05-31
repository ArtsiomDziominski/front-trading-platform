export default defineAppConfig({
  ui: {
    colors: {
      primary: 'emerald',
      neutral: 'zinc',
    },
    card: {
      slots: {
        root: 'rounded-[22px] ring-0',
      },
    },
    button: {
      slots: {
        base: 'rounded-xl font-semibold',
      },
      compoundVariants: [
        {
          color: 'neutral',
          variant: 'outline',
          class: 'ring-[var(--color-border)] text-[var(--color-text)] bg-[var(--color-surface-muted)] hover:bg-[rgb(255_255_255/8%)] hover:ring-[rgb(255_255_255/12%)]',
        },
      ],
    },
    input: {
      slots: {
        base: 'rounded-xl',
      },
    },
  },
})
