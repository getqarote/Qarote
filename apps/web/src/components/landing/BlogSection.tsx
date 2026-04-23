export interface BlogPostPreview {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  tags?: string[];
  readingTimeMin?: number;
}

interface BlogSectionProps {
  posts: BlogPostPreview[];
}

const BlogSection = ({ posts }: BlogSectionProps) => {
  if (posts.length === 0) return null;

  return (
    <section className="pt-12 pb-20 bg-muted/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4 max-w-4xl mx-auto leading-[1.2] font-normal">
            From the blog
          </h2>
          <p className="text-xl text-muted-foreground">
            RabbitMQ tips, debugging guides, and best practices.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <a
              key={post.slug}
              href={`/blog/${post.slug}/`}
              className="group border border-border bg-background p-6 flex flex-col gap-4 hover:border-primary/50 transition-colors duration-200"
            >
              <div className="flex-1 flex flex-col gap-3">
                <h3 className="text-lg font-medium text-foreground leading-snug group-hover:text-primary transition-colors duration-200">
                  {post.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                  {post.description}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <time dateTime={post.publishedAt}>
                  {new Date(post.publishedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </time>
                {post.readingTimeMin && (
                  <span>{post.readingTimeMin} min read</span>
                )}
              </div>

              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 bg-primary/10 text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </a>
          ))}
        </div>

        <div className="text-center mt-12">
          <a
            href="/blog/"
            className="inline-flex items-center justify-center text-foreground hover:text-primary px-4 py-3 transition-all duration-200 text-base font-medium underline decoration-1 underline-offset-[0.625rem] hover:decoration-primary"
          >
            View all articles
          </a>
        </div>
      </div>
    </section>
  );
};

export default BlogSection;
