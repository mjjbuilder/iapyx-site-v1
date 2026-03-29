import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Iapyx Labs",
  description: "Exploring the frontier between robotics, computer science, and biology to make mobility accessible to all.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

