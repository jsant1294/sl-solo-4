import type { Config } from "tailwindcss";

const h = (v: string) => `hsl(var(--${v}) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: h("bg"), "bg-raised": h("bg-raised"), "bg-sunken": h("bg-sunken"),
        ink: h("ink"), "ink-soft": h("ink-soft"), "ink-faint": h("ink-faint"),
        line: h("line"), "line-strong": h("line-strong"),
        gold: h("gold"), "gold-bright": h("gold-bright"), "gold-ink": h("gold-ink"),
        ok: h("ok"), warn: h("warn"), err: h("err"),
      },
      borderRadius: {
        sm: "var(--r-sm)", md: "var(--r-md)", lg: "var(--r-lg)",
        xl: "var(--r-xl)", full: "var(--r-full)",
      },
      maxWidth: { site: "var(--maxw)", prose: "var(--maxw-prose)" },
      boxShadow: { sm: "var(--shadow-sm)", md: "var(--shadow-md)", lg: "var(--shadow-lg)" },
      fontSize: {
        xs: "var(--t-xs)", sm: "var(--t-sm)", base: "var(--t-base)",
        lg: "var(--t-lg)", xl: "var(--t-xl)", "2xl": "var(--t-2xl)",
        "3xl": "var(--t-3xl)", "4xl": "var(--t-4xl)", "5xl": "var(--t-5xl)",
      },
      transitionTimingFunction: { editorial: "var(--ease)" },
    },
  },
  plugins: [],
} satisfies Config;
