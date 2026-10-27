/** Presentation only: retain the original value for editing and persistence. */
export function formatPhone(value:string){
 const match=value.match(/^(\+?)(\d{7,15})(\s*(?:ext\.?|x|#)\s*\d+)?$/i);
 if(!match)return value;
 const [,plus,digits,extension='']=match;
 if(!plus&&digits.length===10)return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}${extension}`;
 if(digits.length===11&&digits.startsWith('1'))return `${plus}1 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}${extension}`;
 return plus+digits.replace(/(\d)(?=(\d{3})+$)/g,'$1 ')+extension;
}
