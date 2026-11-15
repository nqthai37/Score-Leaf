import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { content } from "@/lib/content";
import { CURRENT_SITE } from "@/lib/navigation";
export const metadata:Metadata={title:"Practice tests"};
export default function Tests(){return <><PageHeading eyebrow="MORE WAYS TO GROW" title="Your practice library." description={`${content.tests} themed tests from your current study library. Shared listening and reading groups stay together.`}/><div className="practice-grid">{content.testLibrary.map(test=><article className="panel library-card" key={test.id}><span className="badge">TEST {String(test.id).padStart(2,"0")}</span><h2 className="step-heading">{test.title}</h2><p className="sub">{test.topic}</p><p className="note">{test.questions} questions · {test.minutes} minutes</p><a href={`${CURRENT_SITE}#tests`} className="secondary">Open current test library ↗</a></article>)}</div></>}
