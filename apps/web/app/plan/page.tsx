import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { AvailableOnCurrentSite } from "@/components/preview-notice";
export const metadata:Metadata={title:"Your study rhythm."};
export default function Page(){return <><PageHeading eyebrow="YOUR STUDY SPACE" title={"Your study rhythm."} description={"A flexible routine that fits your next 1–3 months."}/><AvailableOnCurrentSite title={"Keep your current plan moving."} description={"Your 4, 8 or 12-week goal, active study budget and spaced review schedule stay in your current workspace while the new plan view is prepared."} section={"plan"}/></>}
