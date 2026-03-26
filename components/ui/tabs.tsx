"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Tabs as TabsPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Tabs({
	className,
	orientation = "horizontal",
	...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
	return (
		<TabsPrimitive.Root
			data-slot="tabs"
			data-orientation={orientation}
			className={cn(
				"gap-0 m-0   bg-zinc-950/50 backdrop-blur-sm pb-8 gap-0 m-0	 rounded-3xl border-0 outline-0 shadow-xl shadow-black/50 group/tabs overflow-none flex data-[orientation=horizontal]:flex-col",
				className
			)}
			{...props}
		/>
	);
}

const tabsListVariants = cva(
	"bg-black rounded-sm p-[3px] group-data-horizontal/tabs:h-9 group-data-vertical/tabs:rounded-sm data-[variant=line]:rounded-none group/tabs-list text-white inline-flex w-fit items-center justify-center group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
	{
		variants: {
			variant: {
				default: "bg-transparent",
				line: "gap-1 bg-transparent",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	}
);

function TabsList({
	className,
	variant = "default",
	...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
	VariantProps<typeof tabsListVariants>) {
	return (
		<TabsPrimitive.List
			data-slot="tabs-list"
			data-variant={variant}
			className={cn(tabsListVariants({ variant }), className)}
			{...props}
		/>
	);
}

function TabsTrigger({
	className,
	...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
	return (
		<TabsPrimitive.Trigger
			data-slot="tabs-trigger"
			className={cn(
				"gap-0  text-white/60 text-shadow-sm  text-[9px]   rounded-none data-[state=active]:border-0 min-h-9  rounded-t-xl rounded-b-none px-2 py-1 font-medium group-data-vertical/tabs:px-2.5 group-data-vertical/tabs:py-1.5 [&_svg:not([class*='size-'])]:size-4 focus-visible:border-yellow-800/10 focus-visible:ring-ring/0 focus-visible:outline-ring  hover:text-white dark:text-muted-foreground shadow-[inset_0px_-20px_1px_1px_rgba(0,0,0,0.9)] dark:hover:text-foreground relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center whitespace-nowrap transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				"group-data-[variant=line]/tabs-list:bg-black group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
				"data-active:bg-linear-to-b data-active:from-zinc-800 via-30% via-zinc-800/80 data-active:to-zinc-950/10 dark:data-active:text-foreground dark:data-active:border-input dark:data-active:bg-transparent data-active:text-stone-400",
				"after:bg-black/40 after:absolute after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0  group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
				className
			)}
			{...props}
		/>
	);
}

function TabsContent({
	className,
	...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
	return (
		<TabsPrimitive.Content
			data-slot="tabs-content"
			className={cn(
				"text-sm text-foreground text-sm  rounded-xl rounded-b-none overlay-hidden p-8 mb-0 pb-0 shadow-sm shadow-sm/5 flex-1 outline-none",
				className
			)}
			{...props}
		/>
	);
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
