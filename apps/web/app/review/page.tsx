import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { AvailableOnCurrentSite } from "@/components/preview-notice";
export const metadata:Metadata={title:"Make mistakes work for you."};
export default function Page(){return <><PageHeading eyebrow="YOUR STUDY SPACE" title={"Make mistakes work for you."} description={"A clear explanation is another step forward."}/><AvailableOnCurrentSite title={"Your mistake notebook is ready on the current site."} description={"Review the standard explanations and follow your spaced review dates there. This preview does not copy or recalculate your personal history."} section={"review"}/></>}
