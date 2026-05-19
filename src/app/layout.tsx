import type { Metadata } from "next";

import "@/app/globals.css";
import { ContentProvider } from "@/components/content-provider";
import { getUiCssVariables } from "@/content/ui-config";
import { getResolvedContentSnapshot } from "@/lib/content-server";

export const metadata: Metadata = {
  title: "Frances 2020 Reading Phase",
  description: "Training-phase implementation of the Frances et al. (2020) experiment."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const snapshot = getResolvedContentSnapshot();

  return (
    <html lang="en">
      <body style={getUiCssVariables()}>
        <ContentProvider initialSnapshot={snapshot}>{children}</ContentProvider>
      </body>
    </html>
  );
}
