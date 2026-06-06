import type { Metadata } from "next";
import Link from "next/link";
import BlogNav from "@/components/BlogNav";
import { getAllPosts, SITE_URL } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog — CrewTransition",
  description:
    "Practical guidance for UAE cabin crew planning what's next: gratuity and end-of-service, visas, pay, and career pathways on the ground.",
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    title: "Blog — CrewTransition",
    description:
      "Practical guidance for UAE cabin crew planning what's next: gratuity and end-of-service, visas, pay, and career pathways on the ground.",
    url: `${SITE_URL}/blog`,
    siteName: "CrewTransition",
    type: "website",
    images: [{ url: `${SITE_URL}/og-image.png`, alt: "CrewTransition — See what your skills are worth" }],
  },
  twitter: {
    card: "summary",
    title: "Blog — CrewTransition",
    description:
      "Practical guidance for UAE cabin crew planning what's next: gratuity and end-of-service, visas, pay, and career pathways on the ground.",
    images: [`${SITE_URL}/og-image.png`],
  },
};

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <div className="blog-page">
      <BlogNav />
      <main className="blog-container">
        <header style={{ marginBottom: "2rem" }}>
          <p className="blog-eyebrow">CrewTransition Blog</p>
          <h1 className="blog-title" style={{ marginBottom: "0.75rem" }}>
            Planning what&rsquo;s next
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "1.05rem", lineHeight: 1.7 }}>
            Practical, no-fluff guidance for UAE cabin crew — gratuity and end-of-service, visas, pay,
            and the realistic mechanics of building a career on the ground.
          </p>
        </header>

        <section>
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="blog-index-item">
              <p className="blog-index-date">{formatDate(post.published)}</p>
              <h2 className="blog-index-title">{post.title}</h2>
              <p className="blog-index-excerpt">{post.metaDescription}</p>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
