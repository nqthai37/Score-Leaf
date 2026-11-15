import type { Metadata, Viewport } from "next";
import "@/styles/legacy-main.css";
import "@/styles/legacy-library.css";
import "./globals.css";
import { Navigation, Breadcrumb } from "@/components/navigation";
import { PreviewNotice } from "@/components/preview-notice";
export const metadata: Metadata={title:{default:"TOEIC Path Preview",template:"%s · TOEIC Path Preview"},description:"A preview of your next TOEIC study space. Your current learning site stays available.",robots:{index:false,follow:false}};
export const viewport: Viewport={themeColor:"#174f46",width:"device-width",initialScale:1};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a><Navigation/><div className="shell"><header><Breadcrumb/><span className="header-note"><i/>A little better, every day</span></header><main id="main-content"><PreviewNotice/>{children}</main><footer>Made for your next chapter.<span>Independent practice · Not affiliated with ETS</span></footer></div></body></html>}
