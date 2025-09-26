// app/layout.jsx
import "./globals.css";

export const metadata = {
  title: "VenegasAI",
  description: "Fast, simple AI chat."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{
        backgroundColor: "#002d1c",  // dark green
        color: "white",
        minHeight: "100vh",          // full height
        margin: 0,
        display: "flex",
        flexDirection: "column"
      }}>
        {children}
      </body>
    </html>
  );
}
