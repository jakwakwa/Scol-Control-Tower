import type React from "react";
import ExternalFormShell from "@/components/forms/external/external-form-shell";

interface FormShellProps {
	title: string;
	description?: string;
	children: React.ReactNode;
}

const FormShell = ({ title, description, children }: FormShellProps) => {
	return (
		<ExternalFormShell title={title} description={description}>
			<div className=" mx-0 w-full">
				<div className={`bg-transparent w-full ${title === "Document Uploads" ? "max-w-lg" : "" } rounded-xl mx-auto mb-0 px-4`}>{children}</div>
			</div>
		</ExternalFormShell>
	);
};

export default FormShell;
