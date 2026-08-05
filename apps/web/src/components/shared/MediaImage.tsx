import type { MediaFile } from '@events-manager/contracts';
import Image, { type ImageProps } from 'next/image';
import { getMediaAssetUrl } from '@/lib/media';

export interface MediaImageProps extends Omit<ImageProps, 'src'> {
  uuid: string | MediaFile;
}

export default function MediaImage({ uuid, alt, width, height, style, ...rest }: MediaImageProps) {
  const imageStyle = {
    ...style,
    ...(width && !height ? { height: 'auto' } : {}),
    ...(!width && height ? { width: 'auto' } : {}),
  };

  return <Image src={getMediaAssetUrl(uuid)} alt={alt} width={width} height={height} style={imageStyle} {...rest} />;
}
