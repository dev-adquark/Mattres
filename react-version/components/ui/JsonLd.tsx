/**
 * Structured data script. `<` is escaped so content can never close the
 * script tag (per the Next.js JSON-LD guidance). This is the one sanctioned
 * dangerouslySetInnerHTML in the app: the payload is JSON.stringify output of
 * server data, never HTML.
 */
export function JsonLd({ data, id }: { data: object | null | undefined; id?: string }) {
  if (!data) return null;
  return <script id={id} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
