export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://mattres-liart.vercel.app/sitemap.xml',
  };
}
