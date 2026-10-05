// Browser-safe policy shared by UI, server, importer and bucket provisioning.
// Use explicit binary units: 20 MiB = 20,971,520 bytes, not 20,000,000 bytes.
export const MAX_PHOTO_BYTES=20*1024*1024;
export const PHOTO_SIZE_LABEL='20 MiB';
export const PHOTO_MIME_TYPES=['image/jpeg','image/png','image/gif','image/webp'];
export function photoBucketIssues(bucket:{public:boolean;file_size_limit?:number|string|null;allowed_mime_types?:string[]|null}){
 const issues:string[]=[];
 if(bucket.public)issues.push('Bucket must be private.');
 if(Number(bucket.file_size_limit)!==MAX_PHOTO_BYTES)issues.push(`Expected ${MAX_PHOTO_BYTES} bytes (${PHOTO_SIZE_LABEL}); observed ${bucket.file_size_limit??'no limit'}.`);
 const allowed=bucket.allowed_mime_types;
 if(!allowed||allowed.length!==PHOTO_MIME_TYPES.length||!PHOTO_MIME_TYPES.every(mime=>allowed.includes(mime)))issues.push('Allowed MIME types must be exactly image/jpeg, image/png, image/gif, image/webp.');
 return issues;
}
