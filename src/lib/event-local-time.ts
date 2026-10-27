/** datetime-local values represent the editor's displayed browser time zone. */
export function eventLocalDate(iso:string){const d=new Date(iso);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}
export function eventLocalInstant(value:string){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw new Error('Choose a complete date and time.');
 const date=new Date(value);
 if(!Number.isFinite(date.getTime())||eventLocalDate(date.toISOString())!==value)throw new Error('Choose a valid date and time in your time zone.');
 return date.toISOString();
}
