import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"focus-visible:border-ring focus-visible:ring-ring/10 cursor-pointer  aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-sm border border-transparent bg-clip-padding text-sm font-medium focus-visible:ring-[3px] aria-invalid:ring-[3px] [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none ",
	{
		variants: {
			variant: {
				default: "text-muted-foreground px-2 text-xs font-light disabled:opacity-15 ",
				outline:
					" border[1px] border-chart-5/50 shadow-[0_1px_2px_0_rgba(0,0,0,.35)] bg-none hover:bg-input/50 text-secondary-foreground text-secondary-chart-5 aria-expanded:bg-muted aria-expanded:text-foreground ",
				secondary:
					"bg-action/80 shadow-sm shadow-[0_1px_2px_0_rgba(0,0,0,.45)] font-normal text-action-foreground hover:bg-secondary aria-expanded:bg-secondary aria-expanded:text-secondary ",
				ghost:
					" font-light bg-none text-secondary hover:text-secondary-foreground  hover:bg-zinc-500/90 aria-expanded:bg-muted rounded-sm text-foreground p-5 aria-expanded:text-foreground bg-transparent shadow-black/25",
				destructive:
					"bg-destructive/10  backdrop-blure-[4px] hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/20 text-destructive focus-visible:border-destructive/40 dark:hover:bg-destructive/30 shadow-black/25",
				link: "text-primary text-sm bg-teal-900 font-medium hover:bg-cyan-950/90 rounded-lg shadow-md shadow-black/25 ",
				ai: "bg-black/20 text-violet-600 rounded-sm border-white/05 p-0 border-2 outline-4",
			},
			size: {
				default:
					"h-11 gap-1.5 my-2 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
				xs: "h-6 gap-1 px-2.5 text-xs font-light has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
				sm: "h-8 gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
				lg: "h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
				ai: "size-12 text-medium text-xs w-fit  gap-1.5 px-4 py-0 leading-0 h-11 ",
				icon: "size-9",
				"icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
				"icon-sm": "size-8",
				"icon-lg": "size-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	}
);

function Button({
	className,
	variant = "default",
	size = "default",
	asChild = false,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	}) {
	const Comp = asChild ? Slot.Root : "button";

	return (
		<Comp
			data-slot="button"
			data-variant={variant}
			data-size={size}
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Button, buttonVariants };
