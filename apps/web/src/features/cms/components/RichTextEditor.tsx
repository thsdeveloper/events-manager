'use client';

import { Card } from '@/components/ui/card';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
	Bold,
	Code,
	Heading2,
	Heading3,
	ImageIcon,
	Italic,
	Link2,
	Link2Off,
	List,
	ListOrdered,
	Quote,
	Redo2,
	Undo2,
} from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { mediaUrl } from '../lib/media';
import { MediaPickerDialog } from './MediaPicker';

interface RichTextEditorProps {
	value: string;
	onChange: (html: string) => void;
	label?: string;
	placeholder?: string;
	minHeightClassName?: string;
	/** Oferece a biblioteca de mídia do CMS. Fora do CMS não há biblioteca a oferecer. */
	allowImages?: boolean;
}

interface ToolbarButtonProps {
	label: string;
	active?: boolean;
	disabled?: boolean;
	onClick: () => void;
	children: React.ReactNode;
}

function ToolbarButton({ label, active = false, disabled = false, onClick, children }: ToolbarButtonProps) {
	return (
		<Button
			variant={active ? 'secondary' : 'ghost'}
			type="button"
			aria-label={label}
			title={label}
			aria-pressed={active}
			disabled={disabled}
			onMouseDown={(event) => event.preventDefault()}
			onClick={onClick}
			size="icon"
			className="size-8"
		>
			{children}
		</Button>
	);
}

/**
 * Editor WYSIWYG dos blocos de texto e dos posts. Devolve HTML; a API sanitiza
 * antes de guardar, então o que sai daqui só precisa ser HTML bem formado.
 */
export function RichTextEditor({
	value,
	onChange,
	label = 'Conteúdo',
	placeholder,
	minHeightClassName = 'min-h-[240px]',
	allowImages = true,
}: RichTextEditorProps) {
	const editorId = useId();
	const [linkOpen, setLinkOpen] = useState(false);
	const [linkUrl, setLinkUrl] = useState('');
	const [imageOpen, setImageOpen] = useState(false);

	const editor = useEditor({
		immediatelyRender: false,
		// A barra de ferramentas reflete a seleção atual, então cada transação re-renderiza.
		shouldRerenderOnTransaction: true,
		extensions: [
			StarterKit.configure({ heading: { levels: [2, 3] }, link: false }),
			Link.configure({ openOnClick: false, autolink: true, defaultProtocol: 'https' }),
			Image.configure({ inline: false, allowBase64: false }),
		],
		content: value,
		editorProps: {
			attributes: {
				id: editorId,
				role: 'textbox',
				'aria-multiline': 'true',
				'aria-label': label,
				class: cn(
					'prose prose-slate max-w-none px-4 py-3 text-sm focus:outline-none prose-headings:font-semibold prose-a:text-primary',
					minHeightClassName,
				),
			},
		},
		onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
	});

	const state = editor
		? {
				bold: editor.isActive('bold'),
				italic: editor.isActive('italic'),
				h2: editor.isActive('heading', { level: 2 }),
				h3: editor.isActive('heading', { level: 3 }),
				bulletList: editor.isActive('bulletList'),
				orderedList: editor.isActive('orderedList'),
				blockquote: editor.isActive('blockquote'),
				code: editor.isActive('codeBlock'),
				link: editor.isActive('link'),
				canUndo: editor.can().undo(),
				canRedo: editor.can().redo(),
			}
		: null;

	// Conteúdo trocado por fora (ex.: abrir outro bloco no mesmo Sheet).
	useEffect(() => {
		if (!editor || editor.getHTML() === value) return;
		editor.commands.setContent(value, { emitUpdate: false });
	}, [editor, value]);

	if (!editor || !state) {
		return <Card className={cn('animate-pulse', minHeightClassName)} />;
	}

	function applyLink() {
		if (!editor) return;
		const href = linkUrl.trim();
		if (!href) {
			editor.chain().focus().extendMarkRange('link').unsetLink().run();
		} else {
			editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
		}
		setLinkOpen(false);
		setLinkUrl('');
	}

	return (
		<Card className="focus-within:border-border">
			<div
				role="toolbar"
				aria-label="Formatação"
				className="flex flex-wrap items-center gap-0.5 border-b border-border p-1.5"
			>
				<ToolbarButton label="Negrito" active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
					<Bold className="size-4" />
				</ToolbarButton>
				<ToolbarButton
					label="Itálico"
					active={state.italic}
					onClick={() => editor.chain().focus().toggleItalic().run()}
				>
					<Italic className="size-4" />
				</ToolbarButton>
				<span className="mx-1 h-5 w-px bg-muted" />
				<ToolbarButton
					label="Título (H2)"
					active={state.h2}
					onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
				>
					<Heading2 className="size-4" />
				</ToolbarButton>
				<ToolbarButton
					label="Subtítulo (H3)"
					active={state.h3}
					onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
				>
					<Heading3 className="size-4" />
				</ToolbarButton>
				<span className="mx-1 h-5 w-px bg-muted" />
				<ToolbarButton
					label="Lista"
					active={state.bulletList}
					onClick={() => editor.chain().focus().toggleBulletList().run()}
				>
					<List className="size-4" />
				</ToolbarButton>
				<ToolbarButton
					label="Lista numerada"
					active={state.orderedList}
					onClick={() => editor.chain().focus().toggleOrderedList().run()}
				>
					<ListOrdered className="size-4" />
				</ToolbarButton>
				<ToolbarButton
					label="Citação"
					active={state.blockquote}
					onClick={() => editor.chain().focus().toggleBlockquote().run()}
				>
					<Quote className="size-4" />
				</ToolbarButton>
				<ToolbarButton
					label="Código"
					active={state.code}
					onClick={() => editor.chain().focus().toggleCodeBlock().run()}
				>
					<Code className="size-4" />
				</ToolbarButton>
				<span className="mx-1 h-5 w-px bg-muted" />
				<ToolbarButton
					label={state.link ? 'Editar link' : 'Inserir link'}
					active={state.link}
					onClick={() => {
						setLinkUrl((editor.getAttributes('link').href as string | undefined) ?? '');
						setLinkOpen((open) => !open);
					}}
				>
					<Link2 className="size-4" />
				</ToolbarButton>
				{state.link && (
					<ToolbarButton label="Remover link" onClick={() => editor.chain().focus().unsetLink().run()}>
						<Link2Off className="size-4" />
					</ToolbarButton>
				)}
				{allowImages && (
					<ToolbarButton label="Inserir imagem" onClick={() => setImageOpen(true)}>
						<ImageIcon className="size-4" />
					</ToolbarButton>
				)}
				<span className="ml-auto flex items-center gap-0.5">
					<ToolbarButton label="Desfazer" disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()}>
						<Undo2 className="size-4" />
					</ToolbarButton>
					<ToolbarButton label="Refazer" disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()}>
						<Redo2 className="size-4" />
					</ToolbarButton>
				</span>
			</div>
			{linkOpen && (
				<div className="flex items-center gap-2 border-b border-border bg-muted px-3 py-2">
					<Input
						aria-label="Endereço do link"
						value={linkUrl}
						onChange={(event) => setLinkUrl(event.target.value)}
						placeholder="https://… ou /pagina"
						onKeyDown={(event) => {
							if (event.key === 'Enter') {
								event.preventDefault();
								applyLink();
							}
						}}
						className="h-8"
					/>
					<Button type="button" size="sm" onClick={applyLink}>
						Aplicar
					</Button>
					<Button type="button" size="sm" variant="ghost" onClick={() => setLinkOpen(false)}>
						Cancelar
					</Button>
				</div>
			)}
			<EditorContent editor={editor} data-placeholder={placeholder} />
			{allowImages && (
				<MediaPickerDialog
					open={imageOpen}
					onOpenChange={setImageOpen}
					onSelect={(media) => {
						editor
							.chain()
							.focus()
							.setImage({ src: mediaUrl(media), alt: media.title ?? media.filename ?? '' })
							.run();
						setImageOpen(false);
					}}
				/>
			)}
		</Card>
	);
}
