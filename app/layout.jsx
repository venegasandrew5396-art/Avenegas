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
      <body className="vx-body">
        <header className="vx-header">
          <img src="/logo-owl.png" alt="VenegasAI" className="vx-logo" />
          <span className="vx-brand">VenegasAI</span>
        </header>

        <main className="vx-shell">{children}</main>

        <footer className="vx-footer">
          © {new Date().getFullYear()} VenegasAI
        </footer>
      </body>
    </html>
  );
}
