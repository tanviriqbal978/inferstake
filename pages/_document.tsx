import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/logo.png" type="image/png" />
        <meta name="theme-color" content="#2D6A4F" />
        <meta property="og:type"        content="website" />
        <meta property="og:title"       content="InferStake — Stake with Intelligence" />
        <meta property="og:description" content="AI-powered staking protocol on Ritual Chain." />
        <meta property="og:image"       content="/logo.png" />
        <meta name="twitter:card"       content="summary_large_image" />
      </Head>
      <body style={{ margin: 0, background: "#F5F0E8" }}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
