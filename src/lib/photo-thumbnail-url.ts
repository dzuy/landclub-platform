export const THUMBNAIL_WIDTHS = [160,640] as const;
export type ThumbnailWidth = typeof THUMBNAIL_WIDTHS[number];

// Keep canonical URLs in property records; only presentation uses derivatives.
export function photoThumbnailUrl(src:string,width:ThumbnailWidth=640){
 if(/^\/api\/property-photos\/[0-9a-f-]{36}$/.test(src))return `${src}?thumbnail=${width}`;
 if(/^\/images\/(cabin|coast|desert|farm|interior|landscape)\.(jpg|png)$/.test(src))return src.replace(/\.(jpg|png)$/,`.thumb-${width}-v1.webp`);
 return src;
}
