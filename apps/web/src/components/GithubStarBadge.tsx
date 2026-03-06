import { useEffect, useState } from "react";

import { Github } from "lucide-react";

type GithubRepoInfo = {
  stargazers_count: number;
};

export function GithubStarBadge() {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("https://api.github.com/repos/getqarote/Qarote")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: GithubRepoInfo | null) => {
        if (!cancelled && data && typeof data.stargazers_count === "number") {
          setStars(data.stargazers_count);
        }
      })
      .catch(() => {
        // swallow errors silently; we just won't show the count
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <a
      href="https://github.com/getqarote/Qarote"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View Qarote on GitHub"
      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
    >
      <Github className="h-4 w-4" aria-hidden="true" />
      {stars !== null && <span>{stars.toLocaleString()}</span>}
    </a>
  );
}
