"""Failure and recovery tests for the public game mirror; no network required."""

import hashlib
import http.client
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import urllib.error
import urllib.parse

import mirror


SOURCE = "https://game.example"


def manifest_for(files):
    entries = [{"path": path, "bytes": len(body), "sha256": hashlib.sha256(body).hexdigest()}
               for path, body in sorted(files.items())]
    release = hashlib.sha256(json.dumps(entries, separators=(",", ":")).encode()).hexdigest()
    return json.dumps({"schema": 1, "release": release, "files": entries}, separators=(",", ":")).encode()


class Response(io.BytesIO):
    def __init__(self, body, url, status=200, headers=None, redirected=None):
        super().__init__(body)
        self.status = status
        self.headers = {} if headers is None else headers
        self.url = redirected or url

    def geturl(self):
        return self.url


class FakeOrigin:
    """Provides independent HTTP responses while preserving request validation."""

    def __init__(self, files):
        self.files = dict(files)
        self.manifests = [manifest_for(files)]
        self.errors = {}
        self.responses = {}
        self.requests = []

    def open(self, request, timeout):
        url = urllib.parse.urlsplit(request.full_url)
        if url.scheme != "https" or url.netloc != "game.example":
            raise AssertionError("Request escaped the configured HTTPS origin")
        if timeout != 30:
            raise AssertionError("Network timeout is missing")
        path = url.path.lstrip("/")
        self.requests.append(path)
        if path in self.errors:
            error = self.errors[path]
            if isinstance(error, list):
                error = error.pop(0) if error else None
            if error is not None:
                raise error
        if path in self.responses:
            return Response(url=request.full_url, **self.responses[path])
        if path == mirror.MANIFEST_NAME:
            body = self.manifests.pop(0) if len(self.manifests) > 1 else self.manifests[0]
        else:
            body = self.files[path]
        return Response(body, request.full_url, headers={"Content-Length": str(len(body))})


class MirrorTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.repo = self.root / "repo"
        self.repo.mkdir()
        self.write("README.md", b"Repository documentation stays here.")
        self.write(".github/workflows/sync.yml", b"trusted workflow")
        self.write("sync/mirror.py", b"trusted downloader")
        self.write(".sync-heartbeat", b"trusted heartbeat")
        self.files = {"app.js": b"console.log('hello');", "index.html": b"<script src='./app.js'></script>",
                      "audio/voice.wav": b"example-wave-bytes", "fonts/README.md": b"font licence notes"}

    def write(self, path, body):
        target = self.repo / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(body)

    def tree(self):
        result = {}
        for path in self.repo.rglob("*"):
            key = str(path.relative_to(self.repo))
            if path.is_symlink():
                result[key] = ("link", str(path.readlink()))
            elif path.is_file():
                result[key] = ("file", path.read_bytes())
            else:
                result[key] = ("directory",)
        return result

    def run_mirror(self, files=None, origin=None, output_path=None):
        origin = origin or FakeOrigin(self.files if files is None else files)
        self.origin = origin
        downloader = mirror.Downloader(SOURCE, opener=origin, sleep=lambda seconds: None)
        return mirror.mirror(self.repo, downloader=downloader, output_path=output_path)

    def assert_failed_unchanged(self, origin):
        before = self.tree()
        with self.assertRaises(mirror.MirrorError):
            self.run_mirror(origin=origin)
        self.assertEqual(self.tree(), before)

    def test_first_sync_stages_only_public_assets_and_outputs_release(self):
        output = self.root / "github-output"
        result = self.run_mirror(output_path=output)
        self.assertTrue(result.changed)
        for path, body in self.files.items():
            self.assertEqual((self.repo / path).read_bytes(), body)
            self.assertEqual((self.repo / mirror.STAGE_NAME / path).read_bytes(), body)
        state = json.loads((self.repo / mirror.STATE_NAME).read_bytes())
        self.assertEqual(state["paths"], sorted(self.files))
        self.assertEqual(state["release"], result.release)
        self.assertEqual(output.read_text(), f"changed=true\nrelease={result.release}\n")
        self.assertEqual((self.repo / ".nojekyll").read_bytes(), b"")
        self.assertFalse((self.repo / mirror.STAGE_NAME / "sync").exists())
        self.assertFalse((self.repo / mirror.STAGE_NAME / mirror.STATE_NAME).exists())
        self.assertEqual((self.repo / "README.md").read_bytes(), b"Repository documentation stays here.")

    def test_unchanged_release_uses_verified_cache_and_rebuilds_artifact(self):
        self.run_mirror()
        self.write(mirror.STAGE_NAME + "/stale.txt", b"must not survive")
        output = self.root / "github-output"
        result = self.run_mirror(output_path=output)
        self.assertFalse(result.changed)
        self.assertEqual(self.origin.requests, [mirror.MANIFEST_NAME, mirror.MANIFEST_NAME])
        self.assertFalse((self.repo / mirror.STAGE_NAME / "stale.txt").exists())
        self.assertTrue((self.repo / mirror.STAGE_NAME / "index.html").exists())
        self.assertIn("changed=false\n", output.read_text())

    def test_add_update_delete_preserves_control_files(self):
        self.run_mirror()
        self.write("assets/unmanaged.png", b"not owned by the mirror")
        updated = dict(self.files, **{"app.js": b"updated application", "images/new.png": b"new image"})
        del updated["audio/voice.wav"]
        result = self.run_mirror(updated)
        self.assertTrue(result.changed)
        self.assertEqual((self.repo / "app.js").read_bytes(), b"updated application")
        self.assertTrue((self.repo / "images/new.png").exists())
        self.assertFalse((self.repo / "audio/voice.wav").exists())
        self.assertTrue((self.repo / "assets/unmanaged.png").exists())
        self.assertFalse((self.repo / mirror.STAGE_NAME / "assets/unmanaged.png").exists())
        self.assertEqual((self.repo / ".github/workflows/sync.yml").read_bytes(), b"trusted workflow")
        self.assertEqual((self.repo / ".sync-heartbeat").read_bytes(), b"trusted heartbeat")

    def test_initial_snapshot_establishes_only_previous_managed_paths(self):
        self.write("obsolete.js", b"old game code")
        self.write("unmanaged.js", b"leave this file alone")
        snapshot = {"source_version": 32, "files_sha256": {"obsolete.js": hashlib.sha256(b"old game code").hexdigest()}}
        self.write("SOURCE_SNAPSHOT.json", json.dumps(snapshot).encode())
        self.run_mirror()
        self.assertFalse((self.repo / "obsolete.js").exists())
        self.assertTrue((self.repo / "unmanaged.js").exists())
        self.assertEqual(json.loads((self.repo / "SOURCE_SNAPSHOT.json").read_bytes()), snapshot)

    def test_corrupt_cache_is_downloaded_and_repaired(self):
        self.run_mirror()
        self.write("app.js", b"x" * len(self.files["app.js"]))
        result = self.run_mirror()
        self.assertTrue(result.changed)
        self.assertIn("app.js", self.origin.requests)
        self.assertEqual((self.repo / "app.js").read_bytes(), self.files["app.js"])

    def test_hash_mismatch_fails_once_and_preserves_existing_release(self):
        self.run_mirror()
        files = dict(self.files, **{"app.js": b"new-version"})
        origin = FakeOrigin(files)
        origin.responses["app.js"] = {"body": b"bad-version"}
        self.assert_failed_unchanged(origin)
        self.assertEqual(origin.requests.count("app.js"), 1)

    def test_partial_download_preserves_existing_release(self):
        self.run_mirror()
        files = dict(self.files, **{"app.js": b"a complete new version"})
        origin = FakeOrigin(files)
        origin.responses["app.js"] = {"body": b"a partial"}
        self.assert_failed_unchanged(origin)

    def test_late_failure_after_other_downloads_preserves_every_file(self):
        self.run_mirror()
        files = dict(self.files, **{"app.js": b"new app", "images/new.png": b"new image", "index.html": b"new page"})
        origin = FakeOrigin(files)
        origin.errors["index.html"] = urllib.error.URLError("connection interrupted")
        self.assert_failed_unchanged(origin)
        self.assertEqual(origin.requests.count("index.html"), 3)
        self.assertIn("images/new.png", origin.requests)

    def test_transient_errors_retry_then_succeed(self):
        origin = FakeOrigin(self.files)
        origin.errors["app.js"] = [urllib.error.HTTPError(SOURCE, 503, "unavailable", {}, None),
                                   urllib.error.URLError("temporary network failure")]
        self.assertTrue(self.run_mirror(origin=origin).changed)
        self.assertEqual(origin.requests.count("app.js"), 3)

    def test_interrupted_stream_restarts_without_appending_partial_bytes(self):
        origin = FakeOrigin(self.files)
        original_open = origin.open

        class InterruptedResponse(Response):
            def read(self, size=-1):
                if self.tell():
                    raise http.client.IncompleteRead(b"partial")
                return super().read(3)

        def interrupted_once(request, timeout):
            response = original_open(request, timeout)
            if urllib.parse.urlsplit(request.full_url).path == "/app.js" and origin.requests.count("app.js") == 1:
                response.close()
                return InterruptedResponse(b"wrong partial bytes", request.full_url)
            return response

        with patch.object(origin, "open", side_effect=interrupted_once):
            self.assertTrue(self.run_mirror(origin=origin).changed)
        self.assertEqual(origin.requests.count("app.js"), 2)
        self.assertEqual((self.repo / "app.js").read_bytes(), self.files["app.js"])

    def test_publication_changing_mid_transfer_preserves_previous_release(self):
        self.run_mirror()
        updated = dict(self.files, **{"app.js": b"new app"})
        origin = FakeOrigin(updated)
        origin.manifests.append(manifest_for(dict(updated, **{"index.html": b"another publication"})))
        self.assert_failed_unchanged(origin)

    def test_redirect_status_or_followed_redirect_is_rejected(self):
        for response in [{"body": b"redirect", "status": 302},
                         {"body": manifest_for(self.files), "redirected": "https://attacker.example/manifest"}]:
            with self.subTest(response=response):
                origin = FakeOrigin(self.files)
                origin.responses[mirror.MANIFEST_NAME] = response
                self.assert_failed_unchanged(origin)
        self.assertIsNone(mirror.NoRedirect().redirect_request(None, None, 302, "", {}, "https://attacker.example"))

    def test_http_redirect_and_not_found_are_not_retried(self):
        for status in (302, 404):
            with self.subTest(status=status):
                origin = FakeOrigin(self.files)
                origin.errors[mirror.MANIFEST_NAME] = urllib.error.HTTPError(SOURCE, status, "failure", {}, None)
                self.assert_failed_unchanged(origin)
                self.assertEqual(origin.requests, [mirror.MANIFEST_NAME])

    def test_unsafe_manifest_paths_cannot_modify_repository_controls(self):
        paths = ["../outside.js", "/app.js", "audio/../app.js", "audio/%2e%2e/app.js", "audio\\app.js",
                 ".github/workflows/pwn.yml", "sync/mirror.py", "README.md", "readme.md", "SOURCE_SNAPSHOT.json",
                 "package.json", ".sync-state.json", "audio/.git/config.js", "https://attacker.example/app.js"]
        for path in paths:
            with self.subTest(path=path):
                origin = FakeOrigin(dict(self.files, **{path: b"untrusted"}))
                self.assert_failed_unchanged(origin)
                self.assertEqual(origin.requests, [mirror.MANIFEST_NAME])

    def test_duplicate_paths_and_false_release_are_rejected(self):
        valid = json.loads(manifest_for(self.files))
        bad_manifests = []
        bad = dict(valid, release="0" * 64)
        bad_manifests.append(json.dumps(bad).encode())
        bad = dict(valid, files=valid["files"] + [valid["files"][0]])
        bad_manifests.append(json.dumps(bad).encode())
        bad_manifests.append(b'{"schema":1,"schema":1,"release":"' + valid["release"].encode() + b'","files":[]}')
        for raw in bad_manifests:
            with self.subTest(raw=raw):
                origin = FakeOrigin(self.files)
                origin.manifests = [raw]
                self.assert_failed_unchanged(origin)

    def test_size_limits_are_checked_before_downloading(self):
        origin = FakeOrigin(self.files)
        manifest = json.loads(origin.manifests[0])
        manifest["files"][0]["bytes"] = mirror.MAX_FILE_BYTES + 1
        origin.manifests = [json.dumps(manifest).encode()]
        self.assert_failed_unchanged(origin)
        self.assertEqual(origin.requests, [mirror.MANIFEST_NAME])

    def test_symlink_file_parent_metadata_and_stage_are_rejected(self):
        outside = self.root / "outside"
        outside.mkdir()
        (outside / "secret.js").write_bytes(b"outside data")
        for name, target in [("app.js", outside / "secret.js"), ("audio", outside),
                             (mirror.STATE_NAME, outside / "secret.js"), (mirror.STAGE_NAME, outside)]:
            with self.subTest(name=name):
                link = self.repo / name
                link.symlink_to(target)
                before = self.tree()
                self.assert_failed_unchanged(FakeOrigin(self.files))
                self.assertEqual(self.tree(), before)
                self.assertEqual((outside / "secret.js").read_bytes(), b"outside data")
                link.unlink()

    def test_failed_install_rolls_back_updates_deletions_and_new_directories(self):
        self.run_mirror()
        before = self.tree()
        files = dict(self.files, **{"app.js": b"new app", "images/new.png": b"new image", "index.html": b"new page"})
        del files["audio/voice.wav"]
        original_copy = mirror._atomic_copy

        def failing_copy(source, destination):
            original_copy(source, destination)
            if destination == (self.repo / "images/new.png").resolve():
                raise OSError("injected filesystem failure after replacement")

        with patch.object(mirror, "_atomic_copy", side_effect=failing_copy):
            with self.assertRaises(OSError):
                self.run_mirror(files)
        self.assertEqual(self.tree(), before)

    def test_failed_workflow_output_rolls_back_new_artifact_and_mirror(self):
        self.run_mirror()
        before = self.tree()
        updated = dict(self.files, **{"app.js": b"new app", "images/new.png": b"new image"})
        del updated["audio/voice.wav"]
        with self.assertRaises(OSError):
            self.run_mirror(updated, output_path=self.root / "missing-folder" / "output")
        self.assertEqual(self.tree(), before)

    def test_invalid_previous_state_cannot_delete_control_files(self):
        self.write(mirror.STATE_NAME, json.dumps({"schema": 1, "release": "0" * 64,
                                                 "paths": [".github/workflows/sync.yml"]}).encode())
        self.assert_failed_unchanged(FakeOrigin(self.files))

    def test_source_requires_https_origin(self):
        for source in ["http://game.example", "https://game.example/path", "https://user:pass@game.example",
                       "https://game.example?x=y", "https://game.example/#fragment", "https://game.example:8443"]:
            with self.subTest(source=source):
                with self.assertRaises(mirror.MirrorError):
                    mirror.Downloader(source)


if __name__ == "__main__":
    unittest.main()
