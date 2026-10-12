import {redirect} from 'next/navigation';

export default async function AdministrationPage(){
 redirect('/dashboard/members');
}
