export default defineAppConfig({
  ui: {
    colors: {
      primary: 'violet',
      neutral: 'zinc',
    },
    card: {
      slots: {
        root: 'rounded-[24px] ring-0',
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
            'ring-[rgb(255_255_255/30%)] text-white bg-transparent hover:bg-[rgb(255_255_255/8%)] hover:ring-[rgb(255_255_255/45%)]',
        },
        {
          color: 'primary',
          variant: 'solid',
          class: 'bg-white text-black hover:bg-[rgb(255_255_255/88%)]',
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
        // flex-wrap: a long hint drops under the label instead of squeezing it into a narrow column
        labelWrapper: 'flex flex-wrap content-center items-center justify-between gap-x-3 gap-y-0.5',
        label: 'block font-medium text-[var(--color-text-muted)]',
        description: 'text-[var(--color-text-muted)]',
        hint: 'text-[var(--color-text-muted)]',
        help: 'text-[var(--color-text-muted)]',
      },
    },
  },
})
