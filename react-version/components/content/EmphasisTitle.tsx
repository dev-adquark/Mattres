interface EmphasisTitleProps {
  title: string;
  /** Substring of `title` set in the display italic. */
  emphasis?: string;
}

/** Renders `title` with the first occurrence of `emphasis` set in the display italic. */
export function EmphasisTitle({ title, emphasis }: EmphasisTitleProps) {
  const index = emphasis ? title.indexOf(emphasis) : -1;
  if (!emphasis || index < 0) return title;
  return (
    <>
      {title.slice(0, index)}
      <em>{emphasis}</em>
      {title.slice(index + emphasis.length)}
    </>
  );
}
