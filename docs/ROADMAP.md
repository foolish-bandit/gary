# Roadmap (Recommended Next PR Order)

## 1) Matter/client structure polish
- **Goal:** improve matter/project/document organization UX for single-lawyer workflows.
- **Scope:** frontend IA/labels/routing polish only.
- **Avoid:** backend schema overhauls.

## 2) Cited-answer UX expectations
- **Goal:** make citations easier to read, open, and trust.
- **Scope:** frontend presentation and interaction polish.
- **Avoid:** model/provider refactors.

## 3) Lint triage (targeted)
- **Goal:** reduce repo-wide lint noise to unblock reliable CI.
- **Scope:** staged cleanup by directory/feature.
- **Avoid:** broad behavior changes hidden in lint PR.

## 4) Backend deployment
- **Goal:** deploy backend to Railway/Render/Fly/VPS and connect frontend URL.
- **Scope:** infra/env/deploy wiring only.
- **Avoid:** forcing backend into Workers.

## 5) Managed Provider Mode
- **Goal:** backend-managed provider keys (remove end-user key burden).
- **Scope:** backend config + frontend messaging.
- **Avoid:** exposing secrets in frontend.

## 6) Private single-user allowlist
- **Goal:** lock access to intended private user(s).
- **Scope:** backend auth gating + frontend fallback UX.
- **Avoid:** premature multi-tenant SaaS features.

## 7) Contract Review real backend workflow
- **Goal:** replace shell behavior with real backend-backed review flow.
- **Scope:** backend workflow execution + frontend result UX.
- **Avoid:** full CLM expansion.

## 8) Draft Something real backend workflow
- **Goal:** backend-backed drafting flow with predictable outputs.
- **Scope:** prompt pipeline + response rendering.
- **Avoid:** broad editor/platform rewrite.

## 9) Explain This real backend workflow
- **Goal:** backend-backed legal-language explanation flow.
- **Scope:** structured sections + consistency controls.
- **Avoid:** major new product area expansion.
