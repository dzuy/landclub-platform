export function eventImagePrompt({title,description,location,start,timeZone}:{title:string;description:string;location:string;start:string;timeZone:string}){
 const clean=(value:string,max:number)=>value.trim().replace(/\s+/g,' ').slice(0,max);
 return [
  'Create a warm, inviting editorial cover photograph for a Land Club event. Use a landscape composition, natural colors, and no text or logos.',
  title.trim()?`Event: ${clean(title,150)}.`:'',
  description.trim()?`Scene and activities: ${clean(description,1100)}`:'',
  location.trim()?`Setting: ${clean(location,300)}.`:'',
  start?`Event starts: ${clean(start.replace('T',' at '),40)} (${clean(timeZone,80)}). Match the lighting and atmosphere to this local time.`:'',
 ].filter(Boolean).join('\n').slice(0,2000);
}
