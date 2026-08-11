export default defineAppConfig({
  ui: {
    colors: {
      primary: 'lime',
      neutral: 'stone',
    },
    card: {
      slots: {
        root: 'rounded-[28px] ring-0',
      },
    },
    button: {
      slots: {
        base: 'rounded-full font-bold tracking-wide',
      },
      compoundVariants: [
        {
          color: 'neutral',
          variant: 'outline',
          class:
            'ring-[rgb(1_51_48/28%)] text-[var(--mm-green-dark)] bg-white hover:bg-[#f3f7ea] hover:ring-[rgb(1_51_48/40%)]',
        },
        {
          color: 'primary',
          variant: 'solid',
          class: 'bg-[var(--color-accent)] text-[var(--mm-green-dark)] hover:bg-[#d4ff6a]',
        },
      ],
    },
    input: {
      slots: {
        base: 'rounded-xl',
      },
    },
    formField: {
      slots: {
        label: 'block font-medium text-[var(--color-text-muted)]',
        description: 'text-[var(--color-text-muted)]',
        hint: 'text-[var(--color-text-muted)]',
        help: 'text-[var(--color-text-muted)]',
      },
    },
  },
})
