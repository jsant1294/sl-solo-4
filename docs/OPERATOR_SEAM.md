# OPERATOR SEAM (future — not built)

Owner and operator are different security concepts. Customers use Profile Studio
through `requireOwnedProfile()`. Internal staff assisting a customer is a
separate path that must be added without weakening owner scoping.

Planned shape (do not implement in Studio):
  SL Operator → search customer → open account → assist WITH explicit
  authorization + audit log.

Rules for whoever builds it:
- Never widen `requireOwnedProfile()` to accept operator identity implicitly.
- Add a distinct `requireOperator()` + per-action audit record.
- Operator writes must be attributable and reversible.
- Kids profiles get the strictest operator gating.
