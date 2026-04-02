import { Button, Section, Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";

interface ApplicantReminderProps {
	contactName?: string;
	itemName: string;
	actionUrl?: string;
	reminderNumber: number;
	maxReminders: number;
}

const ApplicantReminder = ({
	contactName,
	itemName,
	actionUrl,
	reminderNumber,
	maxReminders,
}: ApplicantReminderProps) => {
	const greeting = contactName ? `Dear ${contactName}` : "Dear Applicant";
	const isLast = reminderNumber >= maxReminders;

	return (
		<EmailLayout preview={`Reminder: Your ${itemName} is awaiting completion`}>
			<Section>
				<Text className="text-black text-[14px] leading-[24px]">{greeting},</Text>
				<Text className="text-black text-[14px] leading-[24px]">
					This is a friendly reminder that your <strong>{itemName}</strong> is still
					outstanding. Please complete it at your earliest convenience to avoid delays in
					your onboarding process.
				</Text>
				{isLast && (
					<Text className="text-[#b91c1c] text-[14px] leading-[24px] font-semibold">
						This is your final reminder. If we do not receive a response soon, your
						application may be closed.
					</Text>
				)}
				{actionUrl && (
					<Section className="text-center mt-[24px] mb-[24px]">
						<Button
							className="bg-[#000000] rounded text-white text-[14px] font-semibold no-underline text-center px-5 py-3"
							href={actionUrl}>
							Complete Now
						</Button>
					</Section>
				)}
				<Text className="text-[#666666] text-[12px] leading-[20px]">
					Reminder {reminderNumber} of {maxReminders}. If you have already completed this,
					please disregard this email.
				</Text>
			</Section>
		</EmailLayout>
	);
};

export { ApplicantReminder };
