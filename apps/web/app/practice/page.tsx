import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { AvailableOnCurrentSite } from "@/components/preview-notice";
import { content } from "@/lib/content";
import { CURRENT_SITE } from "@/lib/navigation";
export const metadata:Metadata={title:"Practice by part"};
export default function Practice(){return <><PageHeading eyebrow="FIND YOUR FOCUS" title="Seven parts. A little stronger every day." description="The same listening and reading library, ready for your next step."/><div className="parts-grid">{content.parts.map(part=><article className="panel catalog-part" key={part.part}><span className="eyebrow">PART {part.part} · {part.category}</span><h2>{part.name}</h2><p className="sub">{part.questions} original questions</p><a className="link" href={`${CURRENT_SITE}#practice`}>Practice on current site ↗</a></article>)}</div><AvailableOnCurrentSite title="Keep practicing while this space grows." description="Guest sessions, audio playback and resume will be brought across together. Your current practice stays available." section="practice"/></>}
