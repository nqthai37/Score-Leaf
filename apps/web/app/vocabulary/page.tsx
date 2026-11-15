import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { AvailableOnCurrentSite } from "@/components/preview-notice";
export const metadata:Metadata={title:"A few new words. A little more confidence."};
export default function Page(){return <><PageHeading eyebrow="YOUR STUDY SPACE" title={"A few new words. A little more confidence."} description={"24 business English cards, with Faye and Dmitri recordings."}/><AvailableOnCurrentSite title={"Keep building your vocabulary."} description={"Your vocabulary cards, recorded pronunciation and known-word progress are available on the current site."} section={"vocab"}/></>}
