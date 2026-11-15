#!/usr/bin/env python3
"""Verify and mirror the public game without running downloaded source code."""

from __future__ import annotations

import argparse
import hashlib
import http.client
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from dataclasses import dataclass


DEFAULT_SOURCE = "https://trip-to-the-east-yu-adventure.junjieligo.chatgpt.site"
MANIFEST_NAME = "mirror-manifest.json"
STATE_NAME = ".sync-state.json"
STAGE_NAME = ".pages-stage"
MAX_MANIFEST_BYTES = 2 * 1024 * 1024
MAX_FILE_BYTES = 50 * 1024 * 1024
MAX_TOTAL_BYTES = 250 * 1024 * 1024
MAX_FILES = 5000
CHUNK_BYTES = 64 * 1024
SAFE_DIRECTORIES = {"audio", "fonts", "vendor", "images", "assets", "video", "models", "textures", "data"}
SAFE_EXTENSIONS = {".html", ".js", ".css", ".json", ".wasm", ".wav", ".mp3", ".m4a", ".ogg", ".flac", ".mp4", ".webm", ".woff", ".woff2", ".ttf", ".otf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg", ".ico", ".gltf", ".glb", ".bin", ".txt", ".md"}
RESERVED_NAMES = {"readme.md", "source_snapshot.json", "package.json", "package-lock.json", "manifest.json", MANIFEST_NAME}
HEX_DIGEST = re.compile(r"[0-9a-f]{64}\Z")
SAFE_PATH = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]*(?:/[A-Za-z0-9][A-Za-z0-9._-]*)*\Z")


class MirrorError(Exception):
    """An unsafe or incomplete release; the previous mirror must be retained."""


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


@dataclass(frozen=True)
class Result:
    changed: bool
    release: str
    file_count: int


def _unique_object(pairs):
    obj = {}
    for key, value in pairs:
        if key in obj:
            raise MirrorError("Duplicate JSON object key")
        obj[key] = value
    return obj


def _json(raw):
    try:
        return json.loads(raw.decode("utf-8"), object_pairs_hook=_unique_object,
                          parse_constant=lambda value: (_ for _ in ()).throw(MirrorError("Invalid JSON number")))
    except (UnicodeError, ValueError) as exc:
        raise MirrorError("Invalid UTF-8 JSON") from exc


def _canonical(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def validate_path(path):
    if not isinstance(path, str) or len(path) > 240 or not SAFE_PATH.fullmatch(path):
        raise MirrorError("Unsafe public asset path")
    parts = PurePosixPath(path).parts
    if len(parts) > 16 or any(part in (".", "..") for part in parts):
        raise MirrorError("Unsafe public asset path")
    if len(parts) > 1 and parts[0] not in SAFE_DIRECTORIES:
        raise MirrorError("Asset is outside approved public directories")
    if len(parts) == 1 and path.lower() in RESERVED_NAMES:
        raise MirrorError("Asset would replace a repository control file")
    if PurePosixPath(path).suffix.lower() not in SAFE_EXTENSIONS:
        raise MirrorError("Unsupported public asset extension")
    return path


def _validate_path_set(paths):
    checked = [validate_path(path) for path in paths]
    folded = {path.casefold() for path in checked}
    if len(folded) != len(checked):
        raise MirrorError("Duplicate or case-colliding asset paths")
    for path in checked:
        if any(str(parent).casefold() in folded for parent in PurePosixPath(path).parents if str(parent) != "."):
            raise MirrorError("An asset is also used as a directory")
    return checked


def validate_manifest(raw):
    manifest = _json(raw)
    if not isinstance(manifest, dict) or set(manifest) != {"schema", "release", "files"} or type(manifest["schema"]) is not int or manifest["schema"] != 1:
        raise MirrorError("Unsupported public manifest schema")
    if not isinstance(manifest["release"], str) or not HEX_DIGEST.fullmatch(manifest["release"]):
        raise MirrorError("Invalid release digest")
    files = manifest["files"]
    if not isinstance(files, list) or not 1 <= len(files) <= MAX_FILES:
        raise MirrorError("Invalid public file count")
    canonical_files = []
    total = 0
    for entry in files:
        if not isinstance(entry, dict) or set(entry) != {"path", "bytes", "sha256"}:
            raise MirrorError("Invalid asset record")
        path = validate_path(entry["path"])
        size = entry["bytes"]
        digest = entry["sha256"]
        if type(size) is not int or not 0 <= size <= MAX_FILE_BYTES:
            raise MirrorError("Invalid asset size")
        if not isinstance(digest, str) or not HEX_DIGEST.fullmatch(digest):
            raise MirrorError("Invalid asset digest")
        total += size
        canonical_files.append({"path": path, "bytes": size, "sha256": digest})
    paths = _validate_path_set([entry["path"] for entry in canonical_files])
    if paths != sorted(paths) or "index.html" not in paths or total > MAX_TOTAL_BYTES:
        raise MirrorError("Manifest must be sorted, complete, and within size limits")
    release = hashlib.sha256(_canonical(canonical_files)).hexdigest()
    if release != manifest["release"]:
        raise MirrorError("Release digest does not match its file inventory")
    return manifest


def validate_source(source):
    try:
        parsed = urllib.parse.urlsplit(source)
        port = parsed.port
    except (ValueError, TypeError) as exc:
        raise MirrorError("Invalid source URL") from exc
    if (parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password
            or port not in (None, 443) or parsed.path not in ("", "/") or parsed.query or parsed.fragment):
        raise MirrorError("Source must be an HTTPS origin, without credentials or a path")
    return urllib.parse.urlunsplit(("https", parsed.netloc, "", "", ""))


def _safe_file(repo, relative):
    path = repo
    parts = PurePosixPath(relative).parts
    for index, part in enumerate(parts):
        path = path / part
        try:
            mode = path.lstat().st_mode
        except FileNotFoundError:
            continue
        if stat.S_ISLNK(mode):
            raise MirrorError("A mirror path contains a symbolic link")
        if index < len(parts) - 1 and not stat.S_ISDIR(mode):
            raise MirrorError("A mirror parent is not a directory")
        if index == len(parts) - 1 and not stat.S_ISREG(mode):
            raise MirrorError("A mirror asset is not a regular file")
    return path


def _hash_file(path):
    digest = hashlib.sha256()
    size = 0
    with path.open("rb") as stream:
        while chunk := stream.read(CHUNK_BYTES):
            digest.update(chunk)
            size += len(chunk)
    return size, digest.hexdigest()


def _matches(path, entry):
    return path.exists() and path.stat().st_size == entry["bytes"] and _hash_file(path) == (entry["bytes"], entry["sha256"])


def _read_bounded(path, limit=MAX_MANIFEST_BYTES):
    with path.open("rb") as stream:
        raw = stream.read(limit + 1)
    if len(raw) > limit:
        raise MirrorError("Local sync metadata exceeds its size limit")
    return raw


def _previous_paths(repo):
    state_path = _safe_file(repo, STATE_NAME)
    if state_path.exists():
        state = _json(_read_bounded(state_path))
        if (not isinstance(state, dict) or set(state) != {"schema", "release", "paths"}
                or type(state["schema"]) is not int or state["schema"] != 1
                or not isinstance(state["release"], str) or not HEX_DIGEST.fullmatch(state["release"])
                or not isinstance(state["paths"], list) or len(state["paths"]) > MAX_FILES):
            raise MirrorError("Invalid previous sync state")
        return set(_validate_path_set(state["paths"]))
    snapshot_path = _safe_file(repo, "SOURCE_SNAPSHOT.json")
    if snapshot_path.exists():
        snapshot = _json(_read_bounded(snapshot_path))
        hashes = snapshot.get("files_sha256") if isinstance(snapshot, dict) else None
        if not isinstance(hashes, dict) or len(hashes) > MAX_FILES:
            raise MirrorError("Invalid initial source snapshot")
        if any(not isinstance(digest, str) or not HEX_DIGEST.fullmatch(digest) for digest in hashes.values()):
            raise MirrorError("Invalid initial source snapshot hashes")
        return set(_validate_path_set(list(hashes)))
    # Without ownership metadata, existing unrelated files are never deleted.
    return set()


class Downloader:
    def __init__(self, source, opener=None, sleep=time.sleep):
        self.source = validate_source(source)
        self.opener = opener or urllib.request.build_opener(NoRedirect())
        self.sleep = sleep

    def fetch(self, path, *, limit, expected=None, destination=None, release=None):
        query = urllib.parse.urlencode({"mirror": release or uuid.uuid4().hex})
        url = self.source + "/" + path + "?" + query
        request = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (compatible; TripToTheEastMirror/1.0)",
            "Cache-Control": "no-cache", "Accept-Encoding": "identity",
        })
        for attempt in range(3):
            try:
                with self.opener.open(request, timeout=30) as response:
                    if response.status != 200 or response.geturl() != url:
                        raise MirrorError("Unexpected HTTP response or redirect")
                    content_length = response.headers.get("Content-Length")
                    if content_length is not None:
                        try:
                            length = int(content_length)
                        except ValueError as exc:
                            raise MirrorError("Invalid HTTP content length") from exc
                        if length < 0 or length > limit or (expected and length != expected["bytes"]):
                            raise MirrorError("HTTP content length differs from manifest")
                    digest = hashlib.sha256()
                    size = 0
                    chunks = []
                    stream = destination.open("wb") if destination else None
                    try:
                        while chunk := response.read(CHUNK_BYTES):
                            size += len(chunk)
                            if size > limit or (expected and size > expected["bytes"]):
                                raise MirrorError("Downloaded asset exceeds its size limit")
                            digest.update(chunk)
                            if stream:
                                stream.write(chunk)
                            else:
                                chunks.append(chunk)
                    finally:
                        if stream:
                            stream.close()
                    if expected and (size != expected["bytes"] or digest.hexdigest() != expected["sha256"]):
                        raise MirrorError("Downloaded asset failed size or SHA-256 verification")
                    return b"".join(chunks) if destination is None else None
            except urllib.error.HTTPError as exc:
                if exc.code not in {408, 429, 500, 502, 503, 504} or attempt == 2:
                    raise MirrorError(f"Source returned HTTP {exc.code}; mirror retained") from exc
            except (urllib.error.URLError, TimeoutError, ConnectionError, http.client.HTTPException) as exc:
                if attempt == 2:
                    raise MirrorError("Source transfer failed after three attempts") from exc
            self.sleep(2 ** attempt)
        raise MirrorError("Source transfer failed")


def _atomic_copy(source, destination):
    destination.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix=".mirror-", dir=destination.parent)
    os.close(descriptor)
    temporary = Path(temporary)
    try:
        shutil.copyfile(source, temporary)
        os.replace(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)


def _install(repo, candidate, workspace, previous, manifest, raw, output_path):
    paths = {entry["path"] for entry in manifest["files"]}
    state_raw = _canonical({"schema": 1, "release": manifest["release"], "paths": sorted(paths)}) + b"\n"
    state_source = workspace / "new-state.json"
    state_source.write_bytes(state_raw)
    (candidate / MANIFEST_NAME).write_bytes(raw)
    (candidate / ".nojekyll").write_bytes(b"")
    wanted = {path: candidate / path for path in paths | {MANIFEST_NAME, ".nojekyll"}}
    wanted[STATE_NAME] = state_source
    touched = set(wanted) | previous
    backup = workspace / "backup"
    backup.mkdir()
    existed = set()
    existing_parents = {repo}
    changed = False
    for relative in sorted(touched):
        target = _safe_file(repo, relative)
        for parent in target.parents:
            if parent == repo:
                break
            if parent.exists():
                existing_parents.add(parent)
        if target.exists():
            existed.add(relative)
            saved = backup / relative
            saved.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(target, saved)
        if relative not in wanted:
            changed |= target.exists()
        else:
            changed |= not target.exists() or _hash_file(target) != _hash_file(wanted[relative])
    stage = repo / STAGE_NAME
    if stage.is_symlink() or (stage.exists() and not stage.is_dir()):
        raise MirrorError("Pages staging destination is not a safe directory")
    old_stage = workspace / "old-pages-stage"
    stage_moved = False
    stage_installed = False
    try:
        for relative, source in sorted(wanted.items()):
            target = _safe_file(repo, relative)
            if not target.exists() or _hash_file(target) != _hash_file(source):
                _atomic_copy(source, target)
        for relative in sorted(previous - paths):
            _safe_file(repo, relative).unlink(missing_ok=True)
        if stage.exists():
            os.replace(stage, old_stage)
            stage_moved = True
        os.replace(candidate, stage)
        stage_installed = True
        if output_path:
            with Path(output_path).open("a", encoding="utf-8") as output:
                output.write(f"changed={str(changed).lower()}\nrelease={manifest['release']}\n")
    except BaseException:
        if stage_installed:
            shutil.rmtree(stage)
        if stage_moved:
            os.replace(old_stage, stage)
        for relative in sorted(touched):
            target = _safe_file(repo, relative)
            if relative in existed:
                # Use the original replacement primitive so an injected write failure
                # cannot prevent restoration in the transaction tests.
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(backup / relative, target)
            else:
                target.unlink(missing_ok=True)
        for parent in sorted({parent for relative in touched for parent in (repo / relative).parents
                              if parent != repo and repo in parent.parents and parent not in existing_parents},
                             key=lambda path: len(path.parts), reverse=True):
            try:
                parent.rmdir()
            except OSError:
                pass
        raise
    return Result(changed=changed, release=manifest["release"], file_count=len(paths))


def mirror(repo, source=DEFAULT_SOURCE, *, downloader=None, output_path=None):
    repo = Path(repo).resolve(strict=True)
    if not repo.is_dir():
        raise MirrorError("Repository path is not a directory")
    downloader = downloader or Downloader(source)
    previous = _previous_paths(repo)
    raw = downloader.fetch(MANIFEST_NAME, limit=MAX_MANIFEST_BYTES)
    manifest = validate_manifest(raw)
    for path in previous | {entry["path"] for entry in manifest["files"]} | {MANIFEST_NAME, ".nojekyll", STATE_NAME}:
        _safe_file(repo, path)
    with tempfile.TemporaryDirectory(prefix=".sync-tmp-", dir=repo) as temporary:
        workspace = Path(temporary)
        candidate = workspace / "candidate"
        candidate.mkdir()
        for entry in manifest["files"]:
            target = candidate / entry["path"]
            target.parent.mkdir(parents=True, exist_ok=True)
            cached = _safe_file(repo, entry["path"])
            if _matches(cached, entry):
                shutil.copyfile(cached, target)
                if _matches(target, entry):
                    continue
            downloader.fetch(entry["path"], limit=entry["bytes"], expected=entry,
                             destination=target, release=manifest["release"])
        final_raw = downloader.fetch(MANIFEST_NAME, limit=MAX_MANIFEST_BYTES)
        validate_manifest(final_raw)
        if final_raw != raw:
            raise MirrorError("Public release changed during download; retry on the next run")
        return _install(repo, candidate, workspace, previous, manifest, raw, output_path)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", default=DEFAULT_SOURCE, help="Public HTTPS source origin")
    parser.add_argument("--repo", default=".", type=Path, help="Repository checkout to update")
    args = parser.parse_args(argv)
    try:
        result = mirror(args.repo, args.source, output_path=os.environ.get("GITHUB_OUTPUT"))
    except (MirrorError, OSError) as exc:
        parser.exit(1, f"Mirror stopped: {exc}\n")
    print(f"Verified {result.file_count} game files; changed={str(result.changed).lower()}; release={result.release}")


if __name__ == "__main__":
    main()
