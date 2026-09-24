'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="section"><h1>We couldn’t load this page.</h1><p>Your saved work is still in the database. Try again, or return to the property list.</p><button onClick={reset}>Try again</button> <a href="/staff/properties">Back to properties</a></main>}
