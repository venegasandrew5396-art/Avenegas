// app/layout.jsx
import "./globals.css";

export const metadata = {
  title: "VenegasAI",
  description: "Fast, simple AI chat.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Standard favicons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />

        {/* Apple touch icon */}
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />

        {/* Optional: manifest for PWA support */}
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body>{children}</body>
    </html>
  );
}
