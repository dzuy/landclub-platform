import {z} from 'zod';

export const profileSchema=z.object({
 displayName:z.string().trim().min(1,'Enter your name.').max(100,'Keep your name under 100 characters.'),
 homeRegion:z.string().trim().max(100,'Keep your region under 100 characters.'),
 propertyUpdates:z.boolean(),
 clubEvents:z.boolean(),
 newPlaces:z.boolean(),
});
export type Profile=z.infer<typeof profileSchema>;
export function readProfile(metadata:Record<string,unknown>):Profile{
 const preferences=metadata.land_club_preferences;
 const p=preferences&&typeof preferences==='object'?preferences as Record<string,unknown>:{};
 return {
  displayName:typeof metadata.display_name==='string'?metadata.display_name:typeof metadata.full_name==='string'?metadata.full_name:'',
  homeRegion:typeof metadata.home_region==='string'?metadata.home_region:'',
  propertyUpdates:p.propertyUpdates===true,clubEvents:p.clubEvents===true,newPlaces:p.newPlaces===true,
 };
}
export function profileMetadata(profile:Profile){return {display_name:profile.displayName,home_region:profile.homeRegion,land_club_preferences:{propertyUpdates:profile.propertyUpdates,clubEvents:profile.clubEvents,newPlaces:profile.newPlaces}};}
