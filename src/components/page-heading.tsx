import type {ReactNode} from 'react';
import styles from './page-heading.module.css';
export function PageHeading({title,description,children}:{title:string;description?:string;children?:ReactNode}){
 return <header className={styles.heading}><div><h1 className={styles.title}>{title}</h1>{description&&<p className={styles.description}>{description}</p>}</div>{children&&<div className={styles.actions}>{children}</div>}</header>;
}
