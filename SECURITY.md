# Security Policy

## Reporting a Vulnerability

Please do not open a public GitHub issue for security vulnerabilities.

Report security issues directly to the maintainer via GitHub's private vulnerability
reporting at https://github.com/shikarii/kotoba-lab/security/advisories/new

Include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested mitigations

You will receive a response within 7 days.

## Scope

This project is a browser-based Japanese IME. It processes no user credentials,
makes no external network requests at runtime, and stores no personal data.

Dictionary data (SKK-JISYO.L) is fetched once at build/setup time from the
public SKK dictionary project.
