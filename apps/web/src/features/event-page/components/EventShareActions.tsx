'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Facebook, Linkedin, Share2 } from 'lucide-react';

export function EventShareActions({ title, slug }: { title: string; slug: string }) {
	const path = `/eventos/${encodeURIComponent(slug)}`;
	const [url, setUrl] = useState(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3003'}${path}`);
	const [copied, setCopied] = useState(false);
	const [fallback, setFallback] = useState(false);
	const [canShare, setCanShare] = useState(false);
	useEffect(() => {
		setUrl(new URL(path, window.location.origin).href);
		setCanShare(typeof navigator.share === 'function');
	}, [path]);
	async function copy() {
		try {
			await navigator.clipboard.writeText(url);
			setCopied(true);
			setFallback(false);
		} catch {
			setFallback(true);
		}
	}
	async function share() {
		try {
			await navigator.share({ title, url });
		} catch (error) {
			if (!(error && typeof error === 'object' && 'name' in error && error.name === 'AbortError')) setFallback(true);
		}
	}
	const networks = [
		{
			name: 'WhatsApp',
			href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
			color: 'bg-[#E7F8EE] text-[#168446] hover:bg-[#D4F2E0]',
			icon: (
				<svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden>
					<path d="M20.5 3.5A11.9 11.9 0 0 0 1.8 17.9L0 24l6.3-1.7A12 12 0 0 0 24 11.9c0-3.2-1.2-6.2-3.5-8.4ZM12 21.8a10 10 0 0 1-5.1-1.4l-.4-.2-3.7 1 1-3.6-.3-.4A9.9 9.9 0 1 1 12 21.8Zm5.5-7.4c-.3-.2-1.8-.9-2-.9s-.5-.2-.7.1l-.9 1.1c-.2.2-.4.2-.7.1a8 8 0 0 1-4-3.5c-.3-.4.2-.4.8-1.5.1-.2 0-.4 0-.6l-.9-2c-.2-.5-.5-.4-.7-.4h-.6c-.2 0-.5.1-.8.4-.8.8-1.2 1.8-.8 3.2.5 1.9 2.3 4 4.7 5.4 2.4 1.4 3.9 1.6 5.1 1.2.7-.2 1.6-1 1.8-1.8.2-.8.2-1.1 0-1.2l-.3-.1Z" />
				</svg>
			),
		},
		{
			name: 'Facebook',
			href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
			color: 'bg-[#EAF1FF] text-[#1877F2] hover:bg-[#D9E7FF]',
			icon: <Facebook className="size-5" aria-hidden />,
		},
		{
			name: 'LinkedIn',
			href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
			color: 'bg-[#E8F3FA] text-[#0A66C2] hover:bg-[#D5EAF7]',
			icon: <Linkedin className="size-5" aria-hidden />,
		},
		{
			name: 'X',
			href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
			color: 'bg-[#231A33] text-white hover:bg-[#3B2C53]',
			icon: (
				<svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
					<path d="M18.9 2H22l-6.8 7.8L23.2 22H17l-4.8-7.3L5.8 22H2.6l7.5-8.6L1.8 2h6.3l4.4 6.7L18.9 2ZM17.8 20h1.7L7.2 3.9H5.4L17.8 20Z" />
				</svg>
			),
		},
	];
	const buttonClass =
		'inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#743DF5]';

	return (
		<div>
			<div className="flex flex-wrap items-center gap-2" role="group" aria-label="Compartilhar este evento">
				{networks.map((network) => (
					<a
						key={network.name}
						href={network.href}
						target="_blank"
						rel="noopener noreferrer"
						aria-label={`Compartilhar no ${network.name}`}
						title={`Compartilhar no ${network.name}`}
						className={`${buttonClass} ${network.color}`}
					>
						{network.icon}
					</a>
				))}
				<button
					type="button"
					aria-label="Copiar link do evento"
					title="Copiar link"
					onClick={copy}
					className={`${buttonClass} bg-[#F3EEFF] text-[#743DF5] hover:bg-[#E7DCFF]`}
				>
					{copied ? <Check className="size-5" aria-hidden /> : <Copy className="size-4" aria-hidden />}
				</button>
				{canShare && (
					<button
						type="button"
						aria-label="Mais opções de compartilhamento"
						title="Mais opções"
						onClick={share}
						className={`${buttonClass} bg-[#F3EEFF] text-[#743DF5] hover:bg-[#E7DCFF]`}
					>
						<Share2 className="size-4" aria-hidden />
					</button>
				)}
			</div>
			<p role="status" className="mt-1 text-xs text-[#743DF5]">
				{copied ? 'Link copiado!' : ''}
			</p>
			{fallback && (
				<label className="mt-3 block text-xs text-muted-foreground">
					Link do evento
					<input
						readOnly
						value={url}
						onFocus={(e) => e.target.select()}
						className="mt-1 block w-full rounded-lg border bg-background p-3 text-sm"
					/>
				</label>
			)}
		</div>
	);
}
