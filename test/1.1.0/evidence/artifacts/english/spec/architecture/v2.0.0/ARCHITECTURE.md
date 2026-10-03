# CLI health architecture

Architecture identity: health-fixture
Architecture version: 2.0.0

## Contents

- [ARCH-001 CLI scope](#arch-001)
- [ARCH-010 Local contract](#arch-010)
- [ARCH-020 Validation](#arch-020)

## Requirements

- Provide deterministic local health JSON.

## Constraints

- A CLI tool, no server or GUI.

## Non-goals

- No database, middleware or gateway.

## External dependencies

- Node.js

## Rejected alternatives

- HTTP service excluded from this fixture.

## Decisions

- Decision DEC-001 [accepted]: Node CLI without framework

<a id="arch-001"></a>
## ARCH-001 CLI scope

A user invokes the local CLI health command and receives deterministic JSON. No HTTP server, GUI, database or gateway.

<a id="arch-010"></a>
## ARCH-010 Local contract

The command returns status ok on success. Failures return a nonzero process code with a diagnostic. No network API is introduced.

<a id="arch-020"></a>
## ARCH-020 Validation

Node tests validate the local command. The same validation contract runs locally and in CI.

### Diagram health-sequence | ARCH-010

![Diagram health-sequence](diagrams/health-sequence.png)

Source: [PlantUML](diagrams/health-sequence.puml)

