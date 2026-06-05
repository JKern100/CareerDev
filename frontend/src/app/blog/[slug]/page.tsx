import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import BlogNav from "@/components/BlogNav";
import { getAllPosts, getPostBySlug, SITE_URL } from "@/lib/blog";

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post not found — CrewTransition" };

  const url = `${SITE_URL}/blog/${post.slug}`;
  const ogImage = `${SITE_URL}/hero-logo.png`;

  return {
    title: post.title,
    description: post.metaDescription,
    keywords: post.tags,
    authors: [{ name: post.author }],
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.metaDescription,
      url,
      siteName: "CrewTransition",
      type: "article",
      publishedTime: post.published,
      modifiedTime: post.updated,
      authors: [post.author],
      tags: post.tags,
      images: [{ url: ogImage, alt: "CrewTransition" }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.metaDescription,
      images: [ogImage],
    },
  };
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const url = `${SITE_URL}/blog/${post.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription,
    datePublished: post.published,
    dateModified: post.updated,
    author: { "@type": "Organization", name: post.author, url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: "CrewTransition",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/hero-logo.png` },
    },
    image: `${SITE_URL}/hero-logo.png`,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    articleSection: post.category,
    keywords: post.tags.join(", "),
  };

  return (
    <div className="blog-page">
      <BlogNav />
      <article className="blog-container">
        <header>
          <p className="blog-eyebrow">{post.category}</p>
          <h1 className="blog-title">{post.title}</h1>
          <p className="blog-meta">
            By {post.author} · {formatDate(post.published)}
            {post.updated !== post.published && <> · Updated {formatDate(post.updated)}</>}
          </p>
        </header>

        <div className="blog-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
        </div>

        <footer className="blog-footer-cta">
          <p>
            <Link href="/blog">← All posts</Link>
          </p>
        </footer>
      </article>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
