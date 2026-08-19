import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Emotional Environment",
  description:
    "A quiet rainy mountain evening designed for sukoon and introspection.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
