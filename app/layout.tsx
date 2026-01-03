import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EFF AutoDiag",
  description: "Professional automotive diagnostic assistant by EFF Performance Engineering",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}


