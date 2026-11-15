import type { Metadata } from "next";
import { AvailableOnCurrentSite } from "@/components/preview-notice";
export const metadata:Metadata={title:"Guest practice"};
export default function GuestSession(){return <div className="preview-session"><AvailableOnCurrentSite title="Your guest practice is on the current site." description="Audio, answers and saved sessions will be moved as one learning flow. Continue your practice there for now." section="practice"/></div>}
