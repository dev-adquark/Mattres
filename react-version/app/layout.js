import './globals.css';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import ScrollReveal from '@/components/ScrollReveal';
import { SpeedInsights } from '@vercel/speed-insights/next';

// NOTE: next/font/google was tried here first (it self-hosts + optimizes
// Google Fonts at build time, which is genuinely better than a render-
// blocking <link> tag) - but that requires fetching the actual font files
// from fonts.googleapis.com at BUILD time, and this sandbox's network is
// blocked to that domain (confirmed: build failed with a 403). Since that
// can't be verified working here, falling back to the same plain <link>
// approach the original project used, which this sandbox CAN fully test.
// If your own environment has normal internet access, switching to
// next/font/google (see commented alternative below) is a worthwhile
// upgrade - just verify the build succeeds in your environment first.
//
// import { Sora, Inter } from 'next/font/google';
// const sora = Sora({ subsets: ['latin'], weight: ['400','500','600','700','800'], variable: '--font-sora' });
// const inter = Inter({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-inter' });

export const metadata = {
  title: 'Mattress Match Score — Find Your Perfect Mattress Match',
  description:
    "Answer a few questions and we'll score every mattress in our catalog against your sleep profile — live, using a real, transparent scoring engine.",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Nav />
        {children}
        <Footer />
        <ScrollReveal />
        <SpeedInsights />
      </body>
    </html>
  );
}
