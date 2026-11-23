---
tags: [mass, autonomous, remote-operation, roc, cyber, imo, code]
---
# MASS Code — International Code of Safety for Maritime Autonomous Surface Ships

## At a glance
| Item | Detail |
|---|---|
| Resolution | MSC.595(111), adopted 21 May 2026 at MSC 111 |
| Status | **Non-mandatory** (1.2) but designed to ease a later move to mandatory |
| Effective | Governments invited to give effect to it from **1 Jul 2026** |
| Applies to | **Cargo ships** under SOLAS chapter I, and their Remote Operations Centres (ROCs) |
| Approach | Supplementary, holistic, goal-based, technology neutral |
| Structure | Part I Introduction · Part II Principles · Part III Goals, functional requirements, expected performances · Appendix and 2 annexes |
| Certificates | MASS Safety Certificate · MASS ROC Certificate |
| Mandatory Code | Expected entry into force 1 Jan 2032 |

![[diagram:mass-structure|Structure of the MASS Code]]

## What the Code does
- Gives an international framework for autonomous or remote operation of key ship functions and systems, for safe, secure and environmentally sound operation (1.1)
- Objectives (1.3): reach the safety and security level expected of a conventional ship · let ships coexist safely · avoid unintended regulatory barriers · require **human oversight and control** of MASS operations and functions
- It is **supplementary**. It applies where the Administration judges compliance with other instruments impracticable or insufficient.
- Enhanced automation alone does not make a ship a MASS (Preamble)
- Governments are invited to apply it, as far as practicable, to MASS under 500 GT

> **Key Point:** The master keeps overall responsibility, wherever the master is. One master is responsible for a MASS at any given time.

## Application (Chapter 2)
- Cargo ships under SOLAS chapter I, including their ROCs
- **Excluded:** cargo high-speed craft under SOLAS chapter X · warships, naval auxiliaries, government ships on non-commercial service

## Timeline
![[diagram:mass-timeline|From adoption to a mandatory code]]

| Date | Step |
|---|---|
| 21 May 2026 | MSC.595(111) adopted (MSC 111, 13–22 May 2026) |
| 1 Jul 2026 | Code takes effect (non-mandatory). |
| 10 Sep 2026 | Resolution re-issued with the adoption date added to its title |
| Dec 2026 | MSC 112 to re-establish a working group on an Experience-Building Phase framework |
| 2028 | Development of the mandatory Code and consideration of a new SOLAS chapter |
| By 1 Jul 2030 | Expected adoption of the first mandatory Code |
| 1 Jan 2032 | Expected entry into force (may be revisited) |

## Key definitions (Chapter 4)
| Term | Meaning |
|---|---|
| MASS (4.19) | A ship which, to a varying degree, can operate independently of human interaction |
| MASS function (4.20) | A task or group of tasks, duties and responsibilities needed for the MASS's operation |
| Autonomous (4.2) | Designed and verified to determine control actions without human intervention under specified conditions |
| Remote operation (4.30) | Operating functions and systems from outside the MASS |
| ROC (4.31) | A location remote from the MASS from which some or all of its functions can be operated |
| Remote operator (4.32) | A qualified person employed or engaged to operate some or all MASS functions from a ROC |
| Operational Design Domain, ODD (4.26) | The design range within which a system can operate as intended |
| Operational Envelope, OE (4.27) | The MASS's operational capabilities and limitations |
| Fallback state (4.12) | A predefined state entered when the MASS cannot stay within its OE |
| Override (4.28) | Taking over control of functions or systems under autonomous or remote operation |
| Third parties (4.40) | Parties engaging with the MASS or ROC without being involved in operating it, such as VTS, ports and pilots |

## Part II — Principles
| Chapter | Content |
|---|---|
| 5 Surveys and certificates | MASS Safety Certificate with a MASS Record (5.1) · MASS ROC Certificate with a MASS ROC Record, one per MASS the ROC operates (5.3) · provisional certificates for testing (5.5) |
| 6 Approval process | Five steps (6.1.6), see below |
| 7 Risk assessment | Covers risks to persons on board, the environment and the MASS, at the level expected of a conventional ship (7.1) · done by people with relevant expertise (7.5) · mitigation in independent layers, including predefined fallback states (7.9) |
| 8 Operational context | Concept of Operations (ConOps, 8.2) · OE and ODD (8.3) · fallback states (8.4) · contingency plans (8.5) · modes of operation (8.6) · human oversight (8.7) |
| 9, 10 | System design · software principles |
| 11 Management of safe operations | Supplements SOLAS and the ISM Code (11.2.1) · the SMS covers all foreseeable modes including ROC roles, HMI, cyber risks, fallback actions · addresses personnel well-being, including stress, and keeps the master's overriding authority (11.2.3) |
| 12 Security | Security at least equal to a conventional ship (12.3.2) · ISPS Code applies to the MASS and any ROC (5.8) · compromised ROC: isolate communications, go to a fallback state (12.4.3) |
| 13, 15 | Alert management · maintenance |
| 14 Manning, training, watchkeeping | See below |

### Certificates
- Issued by the Administration or a recognized organization after initial or renewal survey
- Survey timing and endorsements are harmonized with SOLAS certificates under HSSC 2025
- A certificate ceases to be valid if required surveys are not completed on time, it is not endorsed, or on transfer to another flag (5.6.1)
- The text does not state a fixed certificate duration
- Alternative ROC management: a ROC safety management system (ROCSMS), a ROM Document of Compliance and a ROC Management Certificate (5.7.5, 11.3)

### Approval process (Chapter 6, Annex 1)
![[diagram:mass-approval|The five approval steps]]

- The Administration assesses the MASS with the **Submitter**, the entity seeking approval (6.1.1)
- Follows the approach of MSC.1/Circ.1455 on alternatives and equivalents (6.1.2)
- The ConOps is the base document at each step (6.1.3)
- Changes to assumptions, systems or the ConOps require repeating the affected part of the risk assessment (6.4.2)
- Simulation does not replace full-scale testing (Annex 1)

### Master, manning and watchkeeping (Chapters 8 and 14)
- A human master is responsible for a MASS regardless of mode of operation and must have means to intervene (8.7.3)
- The master may be on board or at a ROC. **If crew or other persons are on board, the master must be physically on board** (14.2.1.11–12).
- Only one master is responsible at any given time (14.2.1.14)
- Remote operators must be qualified to at least the STCW standard (14.2.2)
- Manning accounts for fatigue and provides sufficient rest under STCW and IMO safe manning principles. No fixed hours are set; the Code refers to MSC.1/Circ.1598.
- Remote operators need additional remote-operations training. Crew and remote operators drill together on emergencies and system failures (14.4).

## Part III — Goals, functional requirements, expected performances
- A MASS meets a functional requirement by meeting all its expected performances (EPs), or by confirming relevant arrangements against applicable IMO instruments with the rest meeting the EPs
- Not every Part III chapter applies to every MASS. Chapters may be waived by agreement with the Administration, depending on the ConOps.

| Chapter | Title |
|---|---|
| 16 | Safety of navigation |
| 17 | Connectivity |
| 18 | Remote operations |
| 19 | Structure, subdivision, stability, watertight integrity |
| 20 | Fire protection, detection and extinction |
| 21 | Search and rescue |
| 22 | Carriage of cargoes |
| 23 | Anchoring, towing and mooring |
| 24 | Machinery and electrical installations |

### Connectivity (17.2)
- Keep full connectivity capacity even if a single system fails (17.2.5)
- Redundancy based on the risk assessment (17.2.6)
- Data categorized and prioritized, so higher-priority data takes precedence when capacity drops (17.2.7)
- Connectivity requirements for each voyage phase and mode (17.2.8)
- Monitoring, with measures for disconnection or degradation, including entering a **fallback state** (17.2.9)
- Data integrity and authenticated sources (17.2.10)

### Remote operations (18.2)
- ROC needs a suitable location, secure facilities, reliable connectivity, access to certificates, recovery arrangements, verified systems, enough qualified personnel and tamper-proof data storage (18.2.2)
- Operators can keep a watch, exchange information, take the decisions needed for safe operation (including supporting abandonment), and detect deviations from the OE (18.2.4)
- **Handover** (18.2.5): safe and secure · information synchronized · control never exercised at several locations at once · current control location shown at the ROC and on board · control not lost during transfer

### Search and rescue (21.2)
- The master meets SOLAS duties to assist persons in distress (21.2.1)
- The MASS and its ROC need a ship-specific plan and procedures for giving assistance (21.2.2)
- Rescue equipment must be usable safely without crew present (21.2.3)
- Retrieved persons are accommodated safely until landed, with information and a means to communicate with a ROC (21.2.4)

## Not included (not verified against the original text)
- Old "degrees of autonomy 1 to 4" list. This is from the IMO scoping exercise and is **not part of the Code**.
- "Regulatory scoping exercise 2017–2021 (MSC 98–103)" details
- Old statement "not passenger ships". The Code applies to **cargo ships** and excludes cargo high-speed craft, warships, naval auxiliaries and government non-commercial ships.
- Chapter 16 content on lookout and COLREG compliance (the excerpt checked had only a footnote)
- Chapters 19, 20, 22, 23, 24 content beyond titles
- Appendix certificate forms

## Sources (checked 23 Nov 2026)
- IMO — Resolution MSC.595(111), MASS Code: https://wwwcdn.imo.org/localresources/en/KnowledgeCentre/IndexofIMOResolutions/MSCResolutions/MSC.595(111).pdf
- IMO press briefing — MASS Code adopted: https://www.imo.org/en/mediacentre/pressbriefings/pages/imo-adopts-mass-code.aspx
- DNV — IMO MSC 111: new MASS Code adopted: https://www.dnv.com/news/2026/imo-mcs-111-new-mass-code-adopted/
