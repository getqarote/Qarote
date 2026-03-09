import { useQuery } from "@tanstack/react-query";

import { Github } from "lucide-react";

type GithubRepoInfo = {
  stargazers_count: number;
};

export function GithubStarBadge() {
  const { data: stars } = useQuery({
    queryKey: ["github-stars"],
    queryFn: async () => {
      const res = await fetch("https://api.github.com/repos/getqarote/Qarote");
      if (!res.ok)
        throw new Error(`GitHub API ${res.status} ${res.statusText}`);
      const data: GithubRepoInfo = await res.json();
      return typeof data.stargazers_count === "number"
        ? data.stargazers_count
        : null;
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <a
      href="https://github.com/getqarote/Qarote"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View Qarote on GitHub"
      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
    >
      <Github className="h-4 w-4" aria-hidden="true" />
      {stars != null && <span>{stars.toLocaleString()}</span>}
    </a>
  );
}
