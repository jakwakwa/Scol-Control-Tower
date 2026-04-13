"use client";

import { RiCloseCircleLine, RiSearchLine } from "@remixicon/react";
import { useEffect, useRef, useState } from "react";
import { useDebounce } from "use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
	delay?: number;
}

export function SearchInput({
	value,
	onChange,
	placeholder = "Search...",
	className,
	delay = 300,
}: SearchInputProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [text, setText] = useState(value);
	const [query] = useDebounce(text, delay);

	useEffect(() => {
		onChange(query);
	}, [query, onChange]);

	// Sync with external value if it changes
	useEffect(() => {
		setText(value);
	}, [value]);

	const handleClear = () => {
		setText("");
		onChange("");
		inputRef.current?.focus();
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Escape" && text.length > 0) {
			handleClear();
		}
	};

	return (
		<div className={`relative flex-1 ${className || ""}`}>
			<RiSearchLine className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				ref={inputRef}
				placeholder={placeholder}
				className={cn("pl-10", text.length > 0 && "pr-12")}
				value={text}
				onChange={e => setText(e.target.value)}
				onKeyDown={handleKeyDown}
			/>
			{text.length > 0 ? (
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					aria-label="Clear search"
					className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
					onMouseDown={e => e.preventDefault()}
					onClick={handleClear}>
					<RiCloseCircleLine className="size-4" />
				</Button>
			) : null}
		</div>
	);
}
