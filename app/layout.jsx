// app/layout.jsx
import "./globals.css";

export const metadata = {
  title: "VenegasAI",
  description: "Fast, simple AI chat.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <main style={{ minHeight: "100dvh" }}>{children}</main>
      </body>
    </html>
  );
}
