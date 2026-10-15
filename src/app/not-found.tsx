import Link from "next/link";
export default function NotFound() {
  return (
    <main className="p-12">
      <h1 className="font-display text-4xl">Page not found</h1>
      <Link className="mt-6 inline-block underline" href="/rankings">
        Return to rankings
      </Link>
    </main>
  );
}
