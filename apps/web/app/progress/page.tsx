import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { AvailableOnCurrentSite } from "@/components/preview-notice";
export const metadata:Metadata={title:"See how far you’ve come."};
export default function Page(){return <><PageHeading eyebrow="YOUR STUDY SPACE" title={"See how far you’ve come."} description={"First answers and spaced recall tell different parts of your learning story."}/><AvailableOnCurrentSite title={"Your progress belongs to you."} description={"Your verified results, active study time and review schedule stay in the current workspace. Personal progress is not connected to this preview yet."} section={"progress"}/></>}
