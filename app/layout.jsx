// app/layout.jsx
import "./globals.css";

export const metadata = {
  title: process.env.APP_NAME || "VenegasAI",
  description: "Fast, simple AI chat.",
  icons: {
    icon: "/favicon.ico",            // requires public/favicon.ico
    apple: "/apple-touch-icon.png",  // optional (public/apple-touch-icon.png)
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
