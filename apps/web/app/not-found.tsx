import Link from "next/link";
export default function NotFound() {
  return (
    <section className="panel empty">
      <div className="eyebrow">A FRESH START</div>
      <h1>This page is not here.</h1>
      <p>Head back to your study overview to find your next step.</p>
      <Link href="/dashboard" className="primary">
        Back to overview ↗
      </Link>
    </section>
  );
}
