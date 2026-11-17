'use client';
import dynamic from 'next/dynamic';
import type { ImageCropperDialogProps } from './image-cropper-dialog';
const Cropper = dynamic(() => import('./image-cropper-dialog').then((module) => module.ImageCropperDialog));
export function ImageCropperDialog(props: ImageCropperDialogProps) {
	return props.file ? <Cropper {...props} /> : null;
}
