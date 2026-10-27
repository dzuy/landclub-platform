'use client';
import {createContext,useContext,useState,type ReactNode,type Dispatch,type SetStateAction} from 'react';
import {usePropertyCardOrder} from './use-property-card-order';

type OrderContext=ReturnType<typeof usePropertyCardOrder>&{setDragging:Dispatch<SetStateAction<boolean>>};
const PropertyCardOrderContext=createContext<OrderContext|null>(null);

export function PropertyCardOrderProvider({memberId,propertyIds,children}:{memberId:string;propertyIds:string[];children:ReactNode}){
 const [dragging,setDragging]=useState(false);
 const preference=usePropertyCardOrder(memberId,propertyIds,dragging);
 return <PropertyCardOrderContext.Provider value={{...preference,setDragging}}>{children}</PropertyCardOrderContext.Provider>;
}

export function useSharedPropertyCardOrder(){
 const preference=useContext(PropertyCardOrderContext);
 if(!preference)throw new Error('Property cards and navigation require the member preference provider.');
 return preference;
}
