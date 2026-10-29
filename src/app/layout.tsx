import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AeroScape Simulator | 3D Drone Flight",
  description: "Interactive 3D drone flight simulator with city, mountain, rice paddy and ocean environments.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
