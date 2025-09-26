import "./globals.css";

export const metadata = {
  title: process.env.APP_NAME || "VenegasAI",
  description: "Fast, simple AI chat."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
