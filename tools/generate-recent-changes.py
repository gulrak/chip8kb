#!/usr/bin/env python3
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import re
import subprocess
from typing import List, Optional, Tuple, Union


# -------------------------
# Data model
# -------------------------

@dataclass(frozen=True)
class RecentChange:
    repo_rel_path: str          # e.g. "content/guide/index.md"
    content_rel_path: str       # e.g. "guide/index.md" (for Hugo relref)
    commit: str                 # full SHA
    commit_unix_ts: int         # unix timestamp
    title: str                  # from front matter (best effort)

    def commit_datetime_utc(self) -> datetime:
        return datetime.fromtimestamp(self.commit_unix_ts, tz=timezone.utc)


# -------------------------
# Git helpers
# -------------------------

class GitError(RuntimeError):
    pass


def _run_git(repo_root: Path, args: List[str]) -> str:
    try:
        proc = subprocess.run(
            ["git", "-C", str(repo_root), *args],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        return proc.stdout
    except subprocess.CalledProcessError as e:
        raise GitError(
            f"Git command failed: git {' '.join(args)}\n\nstderr:\n{e.stderr}"
        ) from e


def get_repo_root(start: Path = Path(".")) -> Path:
    out = _run_git(start, ["rev-parse", "--show-toplevel"]).strip()
    return Path(out)


def get_github_repo_http_base(repo_root: Path) -> Optional[str]:
    """
    Parse origin URL into https://github.com/OWNER/REPO if possible.
    Supports:
      - https://github.com/OWNER/REPO(.git)
      - git@github.com:OWNER/REPO(.git)
    """
    try:
        origin = _run_git(repo_root, ["config", "--get", "remote.origin.url"]).strip()
    except GitError:
        return None
    if not origin:
        return None

    m = re.match(r"^https?://github\.com/([^/]+)/([^/]+?)(?:\.git)?/?$", origin)
    if m:
        return f"https://github.com/{m.group(1)}/{m.group(2)}"

    m = re.match(r"^git@github\.com:([^/]+)/([^/]+?)(?:\.git)?$", origin)
    if m:
        return f"https://github.com/{m.group(1)}/{m.group(2)}"

    return None


# -------------------------
# Front matter parsing (best effort, no deps)
# -------------------------

_YAML_TITLE_RE = re.compile(r"^\s*title\s*:\s*(.+?)\s*$")
_TOML_TITLE_RE = re.compile(r"^\s*title\s*=\s*(.+?)\s*$")


def _strip_quotes(s: str) -> str:
    s = s.strip()
    if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
        return s[1:-1]
    return s


def extract_title_from_front_matter(md_path: Path) -> Optional[str]:
    """
    Hugo front matter delimiters:
      YAML: --- ... ---
      TOML: +++ ... +++
    We only extract a simple one-line title.
    """
    try:
        text = md_path.read_text(encoding="utf-8")
    except OSError:
        return None

    lines = text.splitlines()
    if not lines:
        return None

    delim = lines[0].strip()
    if delim not in ("---", "+++"):
        return None

    end_idx = None
    for i in range(1, len(lines)):
        if lines[i].strip() == delim:
            end_idx = i
            break
    if end_idx is None:
        return None

    fm_lines = lines[1:end_idx]
    if delim == "---":
        for line in fm_lines:
            m = _YAML_TITLE_RE.match(line)
            if m:
                return _strip_quotes(m.group(1))
    else:
        for line in fm_lines:
            m = _TOML_TITLE_RE.match(line)
            if m:
                return _strip_quotes(m.group(1))

    return None


# -------------------------
# Core: get N unique most recently touched markdown files
# -------------------------

def list_recent_changed_markdown_files(
    *,
    n: int = 10,
    repo_root: Optional[Path] = None,
    content_dir: str = "content",
    ext: str = ".md",
    diff_filter: str = "AM",  # avoid deletions by default
    exclude_prefixes: Tuple[str, ...] = ("content/posts/",),
    exclude_exact: Tuple[str, ...] = ("content/recent-changes.md",),
) -> List[Tuple[str, str, int]]:
    """
    Returns [(repo_rel_path, commit_sha, commit_unix_ts), ...] newest -> oldest
    for the N most recently touched *unique* markdown files under content_dir,
    excluding paths by prefix / exact match.
    """
    if n <= 0:
        return []

    repo_root = repo_root or get_repo_root()
    content_dir = content_dir.replace("\\", "/").strip("/")
    prefix = content_dir + "/"

    # Normalize excludes to forward slashes
    exclude_prefixes = tuple(p.replace("\\", "/") for p in exclude_prefixes)
    exclude_exact = tuple(p.replace("\\", "/") for p in exclude_exact)

    pretty = "--%H %ct"  # marker makes parsing robust
    args = ["log", f"--pretty=format:{pretty}", "--name-only", f"--diff-filter={diff_filter}", "--", content_dir]
    out = _run_git(repo_root, args)

    seen: set[str] = set()
    results: List[Tuple[str, str, int]] = []

    cur_commit = ""
    cur_ts = 0

    for raw in out.splitlines():
        line = raw.strip()
        if not line:
            continue

        if line.startswith("--"):
            parts = line[2:].split()
            if len(parts) >= 2:
                cur_commit = parts[0]
                cur_ts = int(parts[1])
            continue

        path = line.replace("\\", "/")

        if not path.startswith(prefix):
            continue
        if ext and not path.endswith(ext):
            continue

        if path in exclude_exact:
            continue
        if any(path.startswith(pfx) for pfx in exclude_prefixes):
            continue

        if path in seen:
            continue

        seen.add(path)
        results.append((path, cur_commit, cur_ts))

        if len(results) >= n:
            break

    return results


def build_recent_changes(
    *,
    n: int = 10,
    repo_root: Optional[Path] = None,
    content_dir: str = "content",
    ext: str = ".md",
    exclude_prefixes: Tuple[str, ...] = ("content/posts/",),
    exclude_exact: Tuple[str, ...] = ("content/recent-changes.md",),
) -> List[RecentChange]:
    repo_root = repo_root or get_repo_root()
    triples = list_recent_changed_markdown_files(
        n=n,
        repo_root=repo_root,
        content_dir=content_dir,
        ext=ext,
        exclude_prefixes=exclude_prefixes,
        exclude_exact=exclude_exact,
    )

    changes: List[RecentChange] = []
    prefix = content_dir.replace("\\", "/").strip("/") + "/"

    for repo_rel_path, commit, ts in triples:
        md_path = repo_root / repo_rel_path
        title = extract_title_from_front_matter(md_path) or md_path.stem

        content_rel = repo_rel_path.replace("\\", "/")
        if content_rel.startswith(prefix):
            content_rel = content_rel[len(prefix):]

        changes.append(
            RecentChange(
                repo_rel_path=repo_rel_path,
                content_rel_path=content_rel,
                commit=commit,
                commit_unix_ts=ts,
                title=title,
            )
        )

    return changes


# -------------------------
# GitHub links (optional)
# -------------------------

def github_commit_url(github_base: str, commit: str) -> str:
    return f"{github_base}/commit/{commit}"


def github_commit_file_diff_url(github_base: str, commit: str, repo_rel_path: str) -> str:
    # GitHub uses #diff-<sha256(path)> anchors in commit diff pages.
    path = repo_rel_path.replace("\\", "/")
    h = hashlib.sha256(path.encode("utf-8")).hexdigest()
    return f"{github_base}/commit/{commit}#diff-{h}"


# -------------------------
# Output page
# -------------------------

def write_recent_changes_page(
    *,
    output_md: Path,
    changes: List[RecentChange],
    github_base: Optional[str],
    page_title: str = "Recent Changes",
    date_format: str = "%Y-%m-%d %H:%M UTC",
) -> None:
    output_md.parent.mkdir(parents=True, exist_ok=True)

    lines: List[str] = []
    lines += [
        "---",
        f'title: "{page_title}"',
        "weight: 99",
        "---",
        "",
        f"# {page_title}",
        "",
        "| When | Page | Git |",
        "|---|---|---|",
    ]

    for c in changes:
        when = c.commit_datetime_utc().strftime(date_format)
        page_link = f'[{c.title}]({{{{< relref "{c.content_rel_path}" >}}}})'

        if github_base:
            diff_url = github_commit_file_diff_url(github_base, c.commit, c.repo_rel_path)
            commit_url = github_commit_url(github_base, c.commit)
            git_cell = f"[diff]({diff_url}) · [commit]({commit_url})"
        else:
            git_cell = c.commit[:10]

        lines.append(f"| {when} | {page_link} | {git_cell} |")

    lines.append("")
    output_md.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    repo_root = get_repo_root()
    github_base = get_github_repo_http_base(repo_root)

    out = repo_root / "content" / "recent-changes.md"  # top-level, as requested

    changes = build_recent_changes(
        n=25,
        repo_root=repo_root,
        content_dir="content",
        ext=".md",
        exclude_prefixes=("content/posts/",),
        exclude_exact=("content/recent-changes.md",),
    )

    write_recent_changes_page(
        output_md=out,
        changes=changes,
        github_base=github_base,
        page_title="Recent Changes",
    )

    print(f"Wrote: {out}")


if __name__ == "__main__":
    main()
