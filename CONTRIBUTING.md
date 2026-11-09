# Contributing

Use `templates/package/` as a starting point and the SDK v1 manifest schema in the Talia desktop source as the authority. Declare only used capabilities. Include visible empty/error states, language-aware labels, and fixtures for deterministic checks. Do not bundle secrets, machine-specific paths, or unlicensed third-party assets.

Validate bundles with the public store catalog packer. Include `orkas-app.json`, `index.html`, `README.md`, `LICENSE`, and `NOTICE` in every distributable app package.
