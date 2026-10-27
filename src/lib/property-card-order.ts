/** Ignore stale/duplicate IDs and append newly available properties. */
export function propertyCardOrder(ids:string[],saved:unknown):string[]{
 const allowed=new Set(ids);
 const ordered=Array.isArray(saved)?saved.filter((id):id is string=>typeof id==='string'&&allowed.has(id)):[];
 return [...new Set([...ordered,...ids])];
}
