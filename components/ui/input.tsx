import type * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(
				"bg-input/90 autofill:shadow-[inset_0_0_0_1000px_#1f1a17] autofill:fill-[#c3855e] h-12 rounded-2xl  fill-accent disabled:border-input-border disabled:border-none disabled:text-indigo-200  disabled:opacity-100  inset-shadow-black/30 inset-shadow-sm  border-border border-input-border border-[0.9px] autofill:bg  focus-visible:bg-[rgba(27,23,13,0.74)] focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 border-input-ring px-3 py-1 transition-colors file:h-7 file:text-sm file:font-medium focus-visible:ring-[1px] aria-invalid:ring-2 md:text-sm focus-within:bg-amber-950 active:bg-[var(--gold-950)] placeholder:text-muted-foreground/60 placeholder:italic  placeholder:text-sm w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-black disabled:pointer-events-none disabled:cursor-not-allowed",
				className
			)}
			{...props}
		/>
	);
}

export { Input };
