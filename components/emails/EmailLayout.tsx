import {
	Body,
	Container,
	Head,
	Html,
	Img,
	Preview,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";
import type * as React from "react";

interface EmailLayoutProps {
	preview: string;
	children: React.ReactNode;
}

export const EmailLayout = ({ preview, children }: EmailLayoutProps) => {
	return (
		<Html>
			<Head />
			<Preview>{preview}</Preview>
			<Tailwind
				config={{
					theme: {
						extend: {
							colors: {
								brand: "#000000",
								offwhite: "#fafafa",
							},
						},
					},
				}}>
				<Body className="bg-white my-auto mx-auto font-sans">
					<Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
						<Section className="mt-[32px]">
							<Img
								src={`${process.env.NEXT_PUBLIC_APP_URL || "https://stratcol-onboard-ai.vercel.app"}/assets/control_tower_logo_.svg`}
								width="150"
								height="50"
								alt="StratCol"
								className="my-0 mx-auto"
							/>
						</Section>
						{children}
						<Text className="text-[#666666] text-[12px] leading-[24px] mt-[32px] text-center">
							© {new Date().getFullYear()} StratCol. All rights reserved.
						</Text>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
};

export default EmailLayout;
