import type { Metadata } from "next";

import "@/app/globals.css";
import { ContentProvider } from "@/components/content-provider";
import { getResolvedContentWithOverrides } from "@/lib/content-server";
import { getResolvedUiCssVariables, getResolvedUiSnapshot } from "@/lib/ui-config-server";

export const metadata: Metadata = {
  title: "Frances 2020 Reading Phase",
  description: "Training-phase implementation of the Frances et al. (2020) experiment."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { snapshot, styleOverrides } = getResolvedContentWithOverrides();
  const uiSnapshot = getResolvedUiSnapshot();
  const uiCssVariables = getResolvedUiCssVariables();

  return (
    <html lang="en">
      <body style={uiCssVariables}>
        <ContentProvider initialSnapshot={snapshot} initialStyleOverrides={styleOverrides} initialUiSnapshot={uiSnapshot}>
          {children}
        </ContentProvider>
      </body>
    </html>
  );
}
