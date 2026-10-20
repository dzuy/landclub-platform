export function investmentLabel(position:{project_name:string;kind:string}){
 const kind=position.kind.replaceAll('_',' ');
 return `${position.project_name} · ${kind.charAt(0).toUpperCase()+kind.slice(1)}`;
}
