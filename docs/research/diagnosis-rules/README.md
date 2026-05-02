# Diagnosis Rule Research Notes

Per `docs/plans/diagnosis-rules-sourcing.md` §Workflow, every Tier C
candidate rule gets a research note before implementation. Each note
has a fixed structure ending in a single `Decision:` line that marks
it `ship`, `reject`, or `needs-more-research`. Approved notes
(`Decision: ship`) move into the implementation queue; rejected
notes stay here as a record of why the idea was killed.

The Tier A (8) and Tier B (3) rules already shipped in the engine
have inline citations on `meta.sourceUrl` and don't carry separate
research notes — their behaviour is locked by the unit tests in
`apps/api/src/ee/services/incident/__tests__/`.

## Index

| Rule ID | Status | Note |
|---|---|---|
| `SLOW_FSYNC_NODE` | needs-more-research | [slow-fsync-node.md](./slow-fsync-node.md) |
| `POLICY_MISMATCH` | needs-more-research | [policy-mismatch.md](./policy-mismatch.md) |
| `NETWORK_PARTITION_HEALED` | needs-more-research | [network-partition-healed.md](./network-partition-healed.md) |
| `EXCHANGE_NO_BINDING` | needs-more-research | [exchange-no-binding.md](./exchange-no-binding.md) |
| `TLS_HANDSHAKE_FAILURES_RISING` | needs-more-research | [tls-handshake-failures-rising.md](./tls-handshake-failures-rising.md) |
| `GLOBAL_QOS_USED` | needs-more-research | [global-qos-used.md](./global-qos-used.md) |
| `BINDING_EXPLOSION` | needs-more-research | [binding-explosion.md](./binding-explosion.md) |
| `UNACKED_GROWING_NO_REDELIVERY` | reject | [unacked-growing-no-redelivery.md](./unacked-growing-no-redelivery.md) |
| `CONNECTION_CHURN` | reject | [connection-churn.md](./connection-churn.md) |
