'use client';

import {
	Toast,
	ToastClose,
	ToastDescription,
	ToastProvider,
	ToastTitle,
	ToastViewport,
} from '@/components/ui/toast';
import { TOAST_DEFAULT_DURATION, useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';

export function Toaster() {
	const { toasts } = useToast();

	const getIcon = (variant?: string | null) => {
		const iconClass = "size-5 shrink-0";

		switch (variant) {
			case 'destructive':
				return <XCircle className={iconClass} />;
			case 'success':
				return <CheckCircle2 className={iconClass} />;
			case 'warning':
				return <AlertCircle className={iconClass} />;
			case 'info':
				return <Info className={iconClass} />;
			default:
				return null;
		}
	};

	return (
		<ToastProvider duration={TOAST_DEFAULT_DURATION} swipeDirection="right">
			{toasts.map(function ({ id, title, description, action, variant, ...props }) {
				const icon = getIcon(variant);

				return (
					<Toast key={id} variant={variant} {...props}>
						<div className="flex gap-3 items-start w-full">
							{icon && <div className="mt-0.5">{icon}</div>}
							<div className="grid gap-1 flex-1">
								{title && <ToastTitle>{title}</ToastTitle>}
								{description && <ToastDescription>{description}</ToastDescription>}
							</div>
						</div>
						{action}
						<ToastClose />
					</Toast>
				);
			})}
			<ToastViewport />
		</ToastProvider>
	);
}
