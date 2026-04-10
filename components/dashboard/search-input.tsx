"use client";

import { RiCloseLine, RiSearchLine } from "@remixicon/react";
import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
	};

	return (
		<div className={`relative flex-1 ${className || ""}`}>
			<RiSearchLine className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
			<Input
				placeholder={placeholder}
				className="pl-10 pr-12"
				value={text}
				onChange={e => setText(e.target.value)}
			/>
			{text && (
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground transition-opacity"
					onClick={handleClear}
					aria-label="Clear search">
					<RiCloseLine className="h-5 w-5" />
				</Button>
			)}
		</div>
	);
}
