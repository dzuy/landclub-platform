import {requireMemberPage} from '@/lib/staff';
import {IanPortfolioMock} from '@/components/ian-investor-mock';
export default async function PortfolioPage(){await requireMemberPage();return <IanPortfolioMock/>;}
