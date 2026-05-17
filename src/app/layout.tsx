import type { Metadata } from "next";

import "@/app/globals.css";
import { getUiCssVariables } from "@/content/ui-config";

export const metadata: Metadata = {
  title: "Frances 2020 Reading Phase",
  description: "Training-phase implementation of the Frances et al. (2020) experiment."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={getUiCssVariables()}>{children}</body>
    </html>
  );
}
