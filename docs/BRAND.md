# ScoreLeaf

The application and Vercel project are named **ScoreLeaf**. Production: https://scoreleaf.vercel.app. The requested `toeic-path.vercel.app` address was already in use; ScoreLeaf was subsequently selected as the new name.

The book-and-leaf artwork supplied by the owner is stored unchanged at `apps/web/public/branding/scoreleaf-logo.png`. It is used beside the ScoreLeaf wordmark on the sign-in page and sidebar. `npm --prefix apps/web run brand:icons` creates the browser ICO, app icon and Apple touch icon from that artwork without changing its design.

The existing Vercel project was renamed to `scoreleaf`, and `scoreleaf.vercel.app` was attached as a production domain so it follows deployments. The Supabase project remains the same. Auth Site URL and the allowed callback include the new production address; the previous callback is retained for transition.

Internal storage keys, backup `app` identifiers, content IDs and the database remain compatible with TOEIC Path. Existing backups still import correctly. The GitHub source repository is now [nqthai37/Score-Leaf](https://github.com/nqthai37/Score-Leaf); GitHub redirects the former `toeic-path` repository URL. A new website origin requires signing in again; cloud progress belongs to the same account and is preserved.
