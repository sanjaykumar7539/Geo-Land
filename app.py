"""One-command launcher for the BHUMI IQ application."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import shutil
import subprocess
import sys
import threading
import time
import webbrowser


PROJECT_DIR = Path(__file__).resolve().parent
APP_URL = "http://localhost:5173"
LOCAL_NODE_DIR = Path(r"D:\Project\LLM\.tools\node-v22.14.0-win-x64")


def command_path(name: str) -> str | None:
    local_name = f"{name}.cmd" if os.name == "nt" and name == "npm" else f"{name}.exe"
    local = LOCAL_NODE_DIR / local_name
    if local.exists():
        return str(local)
    return shutil.which(name)


def environment() -> dict[str, str]:
    env = os.environ.copy()
    if LOCAL_NODE_DIR.exists():
        env["PATH"] = f"{LOCAL_NODE_DIR}{os.pathsep}{env.get('PATH', '')}"
    return env


def validate_runtime() -> tuple[str, dict[str, str]]:
    npm = command_path("npm")
    node = command_path("node")
    if not npm or not node:
        raise RuntimeError("Node.js 22 and npm were not found. Install Node.js 22, then retry.")

    result = subprocess.run(
        [node, "--version"],
        cwd=PROJECT_DIR,
        env=environment(),
        capture_output=True,
        text=True,
        check=True,
    )
    major = int(result.stdout.strip().lstrip("v").split(".")[0])
    if major < 22:
        raise RuntimeError(f"Node.js 22+ is required; found {result.stdout.strip()}.")
    return npm, environment()


def ensure_dependencies(npm: str, env: dict[str, str]) -> None:
    if (PROJECT_DIR / "node_modules" / "vinext").exists():
        return
    print("Dependencies are missing. Installing them once…", flush=True)
    subprocess.run([npm, "install"], cwd=PROJECT_DIR, env=env, check=True)


def open_when_ready(open_browser: bool) -> None:
    # Vinext performs a one-time dependency scan before binding the port.
    time.sleep(35)
    print(f"\nOpening: {APP_URL}", flush=True)
    if open_browser:
        webbrowser.open(APP_URL)


def run_check(npm: str, env: dict[str, str]) -> int:
    for script in ("lint", "verify", "build"):
        print(f"\nRunning {script}…", flush=True)
        result = subprocess.run([npm, "run", script], cwd=PROJECT_DIR, env=env)
        if result.returncode:
            return result.returncode
    print("\nAll checks passed.", flush=True)
    return 0


def run_app(npm: str, env: dict[str, str], open_browser: bool) -> int:
    print("Starting BHUMI IQ…", flush=True)
    print("Press Ctrl+C to stop the server.\n", flush=True)
    threading.Thread(target=open_when_ready, args=(open_browser,), daemon=True).start()
    process = subprocess.Popen([npm, "run", "dev"], cwd=PROJECT_DIR, env=env)
    try:
        return process.wait()
    except KeyboardInterrupt:
        print("\nStopping BHUMI IQ…", flush=True)
        process.terminate()
        try:
            process.wait(timeout=8)
        except subprocess.TimeoutExpired:
            process.kill()
        return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Run or verify the BHUMI IQ application.")
    parser.add_argument("--check", action="store_true", help="Run lint, dataset verification, and production build.")
    parser.add_argument("--no-browser", action="store_true", help="Start without opening a browser window.")
    args = parser.parse_args()
    try:
        npm, env = validate_runtime()
        ensure_dependencies(npm, env)
        return run_check(npm, env) if args.check else run_app(npm, env, not args.no_browser)
    except (RuntimeError, subprocess.CalledProcessError, ValueError) as error:
        print(f"Unable to start: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
