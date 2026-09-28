export default function Loading() {
  return (
    <main className="route-loading" role="status" aria-live="polite" aria-label="Loading page">
      <div className="route-loading-inner">
        <span className="route-loading-mark" aria-hidden="true"><span /><span /><span /></span>
        <p className="route-loading-label">Preparing your sleep experience</p>
        <span className="route-loading-track" aria-hidden="true"><span /></span>
      </div>
    </main>
  );
}
