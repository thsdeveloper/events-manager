import type { MediaFile } from '@events-manager/contracts';
import Image, { type ImageProps } from 'next/image';
import { getMediaAssetUrl } from '@/lib/media';

export interface MediaImageProps extends Omit<ImageProps, 'src'> {
	uuid: string | MediaFile;
}

/**
 * Com só o id, a URL é `/api/media/:id`, que redireciona para o storage. O
 * otimizador do `next/image` não segue redirecionamentos (responde 400 e a
 * imagem some), então nesse caso a imagem vai sem otimização: o navegador
 * segue o redirecionamento normalmente. Com o arquivo inteiro, a URL é a do
 * storage e a otimização continua.
 */
export default function MediaImage({ uuid, alt, width, height, style, unoptimized, ...rest }: MediaImageProps) {
	const imageStyle = {
		...style,
		...(width && !height ? { height: 'auto' } : {}),
		...(!width && height ? { width: 'auto' } : {}),
	};
	const src = getMediaAssetUrl(uuid);

	return (
		<Image
			src={src}
			alt={alt}
			width={width}
			height={height}
			style={imageStyle}
			unoptimized={unoptimized ?? src.startsWith('/api/media/')}
			{...rest}
		/>
	);
}
