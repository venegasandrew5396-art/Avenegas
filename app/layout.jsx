import "./globals.css";

export const metadata = {
  title: "VenegasAI",
  description: "Fast, simple AI chat.",
  icons: {
    icon: "/favicon.ico",              // comes from public/favicon.ico
    apple: "/apple-touch-icon.png",    // comes from public/apple-touch-icon.png
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
