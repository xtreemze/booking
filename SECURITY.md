# Security policy

## Supported code

Security fixes target the current `main` branch until formal release channels are introduced.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability involving credentials, tenant isolation, authorization, personal data, payment flows, or exploitable application behavior. Prefer the repository's private vulnerability reporting capability under **Security → Report a vulnerability** when enabled.

Include the affected version/commit, reproduction conditions, expected impact, and any known mitigations. Avoid including unnecessary personal or production data.

## Security engineering baseline

Changes must preserve least privilege, tenant isolation, explicit authorization, validated untrusted inputs, secret separation, auditable privileged actions, and fail-closed behavior for security-sensitive decisions. Production credentials and raw payment-card data must never be committed to this repository.

Security findings are tracked through an auditable lifecycle: discovery, severity, affected scope, owner, remediation, verification, closure, and any explicit risk acceptance.
