'use client';

import { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { getMediaAssetUrl } from '@/lib/media';

interface ImageUploadProps {
	value?: string | null;
	onChange: (fileId: string | null) => void;
	label?: string;
	description?: string;
	required?: boolean;
	folder?: string;
	onUploadStart?: () => void;
	onUploadSuccess?: (fileId: string) => void;
	onUploadError?: (error: string) => void;
}

export interface ImageUploadRef {
	uploadFile: () => Promise<string | null>;
}

const ImageUpload = forwardRef<ImageUploadRef, ImageUploadProps>(({
	value,
	onChange,
	label = 'Imagem',
	description,
	required = false,
	folder = 'events',
	onUploadStart,
	onUploadSuccess,
	onUploadError,
}, ref) => {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<string | null>(
		value && value !== 'local-file'
			? getMediaAssetUrl(value)
			: null
	);
	const [isUploading, setIsUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Expose upload method to parent
	useImperativeHandle(ref, () => ({
		uploadFile: async () => {
			// If no file is selected locally, check if we already have a valid UUID
			if (!selectedFile) {
				// Only return the value if it's a valid UUID (not 'local-file')
				if (value && value !== 'local-file') {
					return value;
				}

				return null;
			}

			try {
				const formData = new FormData();
				formData.append('file', selectedFile);

				const response = await fetch(`/api/upload?folder=${encodeURIComponent(folder)}`, {
					method: 'POST',
					body: formData,
				});

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));

					// RFC 7807 Problem Details format
					if (errorData.title && errorData.detail) {
						throw new Error(errorData.detail);
					}

					// Legacy error format
					throw new Error(errorData.error || 'Erro ao fazer upload da imagem');
				}

				const data = await response.json();
				onChange(data.fileId);

				return data.fileId;
			} catch (error) {
				console.error('Error uploading image:', error);

				// Re-throw with user-friendly message
				if (error instanceof Error) {
					throw new Error(error.message);
				}

				throw new Error('Erro ao fazer upload da imagem. Tente novamente.');
			}
		},
	}));

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) {
			return;
		}

		// Validate file type
		if (!file.type.startsWith('image/')) {
			const errorMsg = 'Por favor, selecione apenas arquivos de imagem';
			alert(errorMsg);
			if (onUploadError) {
				onUploadError(errorMsg);
			}

			return;
		}

		// Validate file size (5MB max)
		if (file.size > 5 * 1024 * 1024) {
			const errorMsg = 'O arquivo deve ter no máximo 5MB';
			alert(errorMsg);
			if (onUploadError) {
				onUploadError(errorMsg);
			}

			return;
		}

		// Create local preview immediately
		const reader = new FileReader();
		reader.onloadend = () => {
			setPreview(reader.result as string);
		};
		reader.readAsDataURL(file);

		// Upload immediately
		setIsUploading(true);
		if (onUploadStart) {
			onUploadStart();
		}

		try {
			const formData = new FormData();
			formData.append('file', file);

			const response = await fetch(`/api/upload?folder=${encodeURIComponent(folder)}`, {
				method: 'POST',
				body: formData,
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));

				// RFC 7807 Problem Details format
				const errorMsg = errorData.detail || errorData.error || 'Erro ao fazer upload da imagem';

				throw new Error(errorMsg);
			}

			const data = await response.json();

			// Update with uploaded file ID
			onChange(data.fileId);
			setSelectedFile(null); // Clear local file reference

			if (onUploadSuccess) {
				onUploadSuccess(data.fileId);
			}
		} catch (error) {
			console.error('Error uploading image:', error);

			const errorMsg = error instanceof Error ? error.message : 'Erro ao fazer upload da imagem. Tente novamente.';

			// Clear preview on error
			setPreview(null);

			if (onUploadError) {
				onUploadError(errorMsg);
			} else {
				alert(errorMsg);
			}

			// Reset onChange to null on error
			onChange(null);
		} finally {
			setIsUploading(false);
		}
	};

	useEffect(() => {
		if (value && value !== 'local-file') {
			setPreview(getMediaAssetUrl(value));
			setSelectedFile(null);
		}

		if (!value) {
			setPreview(null);
			setSelectedFile(null);
		}
	}, [value]);

	const handleRemove = () => {
		setPreview(null);
		setSelectedFile(null);
		onChange(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	const handleClick = () => {
		fileInputRef.current?.click();
	};

	return (
		<div>
			<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
				{label} {required && <span className="text-red-500">*</span>}
			</label>

			<div className="space-y-2">
				{preview ? (
					<div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800">
						<Image src={preview} alt="Preview" fill className="object-cover" />
						{isUploading && (
							<div className="absolute inset-0 bg-black/50 flex items-center justify-center">
								<div className="flex flex-col items-center gap-2 text-white">
									<Loader2 className="size-8 animate-spin" />
									<p className="text-sm font-medium">Enviando imagem...</p>
								</div>
							</div>
						)}
						{!isUploading && (
							<button
								type="button"
								onClick={handleRemove}
								className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
							>
								<X className="size-3" />
							</button>
						)}
					</div>
				) : (
					<div
						onClick={isUploading ? undefined : handleClick}
						className={`relative w-full h-48 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 transition-colors flex flex-col items-center justify-center gap-2 ${
							isUploading ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
						}`}
					>
						{isUploading ? (
							<>
								<Loader2 className="size-8 text-gray-400 animate-spin" />
								<p className="text-sm text-gray-600 dark:text-gray-400">Enviando...</p>
							</>
						) : (
							<>
								<ImageIcon className="size-8 text-gray-400" />
								<p className="text-sm text-gray-600 dark:text-gray-400">Clique para selecionar</p>
								<p className="text-xs text-gray-500">PNG, JPG, GIF até 5MB</p>
							</>
						)}
					</div>
				)}

				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					onChange={handleFileSelect}
					className="hidden"
					disabled={isUploading}
				/>
			</div>

			{description && (
				<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
			)}
		</div>
	);
});

ImageUpload.displayName = 'ImageUpload';

export default ImageUpload;
