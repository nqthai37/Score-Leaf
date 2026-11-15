import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AvailableOnCurrentSite } from "@/components/preview-notice";
export const metadata:Metadata={title:"Saved practice"};
export const dynamic="force-dynamic";
export default async function SavedSession({params}:{params:Promise<{attemptId:string}>}){const {attemptId}=await params;if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attemptId))notFound();return <div className="preview-session"><AvailableOnCurrentSite title="Resume your saved practice on the current site." description="Account sign-in and saved sessions are not connected to this preview yet. No answers or account history are shown here."/></div>}
