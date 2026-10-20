'use client';
import {createContext,useContext} from 'react';
export const MemberTermsNavigation=createContext<((position:string)=>void)|null>(null);
export const useMemberTermsNavigation=()=>useContext(MemberTermsNavigation);
