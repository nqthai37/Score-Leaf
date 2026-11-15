"use client";
import Link from "next/link";
export default function ErrorPage({retry}:{error:unknown;retry:()=>void}){return <section className="panel stage-card" role="alert"><h1>This page could not open.</h1><p className="sub">Try once more, or return to your overview.</p><div className="error-actions"><button type="button" className="primary" onClick={()=>retry()}>Try again</button><Link href="/dashboard" className="secondary">Back to overview</Link></div></section>}
