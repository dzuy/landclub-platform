// Only account-owned objects are exposed through the authenticated endpoint.
export const MAX_PROFILE_PHOTO_BYTES=10*1024*1024;
export function profilePhotoKey(userId:string,metadata:Record<string,unknown>){
 const key=metadata.land_club_avatar;
 return typeof key==='string'&&/^[0-9a-f-]{36}\/[0-9a-f]{64}\.webp$/.test(key)&&key.startsWith(userId+'/')?key:null;
}
export function profilePhotoUrl(userId:string,metadata:Record<string,unknown>){
 const key=profilePhotoKey(userId,metadata);
 return key?'/api/profile-photo?v='+key.split('/')[1]:null;
}
