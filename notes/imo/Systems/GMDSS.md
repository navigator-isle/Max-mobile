---
tags: [gmdss, imo, system, radio, distress, solas, safety]
---
# GMDSS — Global Maritime Distress and Safety System

## At a glance
| Item | Detail |
|---|---|
| What it is | The worldwide system of radio equipment and procedures for distress alerting, search and rescue communications and maritime safety information |
| Legal basis | **SOLAS Chapter IV**, with the ITU Radio Regulations for frequencies and procedures |
| Fully in force | **1 Feb 1999** |
| Applies to | Passenger ships and cargo ships of **300 GT and over** on international voyages |
| Modernized | **MSC.496(105)** and **MSC.497(105)**, in force **1 Jan 2024** |
| Partners | IMO works with the ITU, WMO, IHO, IMSO and the Cospas-Sarsat partners |

> **Key Point:** GMDSS means a ship in distress is heard by rescue centres and nearby ships automatically, not just by someone listening. What you carry depends on the **sea area** you trade in.

## The nine functions (Reg IV/4)
![[diagram:gmdss-functions|The nine functions every ship must be able to perform]]

1. Ship-to-shore distress alerting by **at least two separate and independent means**
2. Shore-to-ship distress alert relay
3. Ship-to-ship distress alerting
4. Search and rescue coordination communications
5. On-scene communications
6. Transmitting and receiving locating signals
7. Receiving maritime safety information (MSI)
8. Urgency and safety communications
9. Bridge-to-bridge communications

General radiocommunications are required in addition (Reg IV/4.1.2).

## Sea areas (Reg IV/2)
| Area | Definition (as amended 2024) | Rough range |
|---|---|---|
| **A1** | Within coverage of a VHF coast station with continuous DSC alerting | About 20 to 30 nm |
| **A2** | Outside A1, within coverage of an MF coast station with continuous DSC alerting | About 100 nm |
| **A3** | Outside A1 and A2, within coverage of a recognized mobile satellite service with continuous alerting | Depends on the satellite service fitted |
| **A4** | Outside A1, A2 and A3 | Whatever is left |

![[diagram:gmdss-areas|What each sea area needs]]

- Since 2024 A3 is no longer tied to Inmarsat. Coverage depends on the recognized mobile satellite service (RMSS) ship earth station (SES) you fit
- Where two SES units are fitted, the one with the smaller coverage sets the ship's A3 area. The duplicate must cover at least the primary's range
- Using another RMSS system (for example Iridium instead of Inmarsat) is subject to flag State acceptance

## Equipment
### For every ship
- **VHF** with DSC on channel 70 and radiotelephony on channels **6, 13 and 16**
- A **406 MHz EPIRB**
- A **radar SART or AIS-SART**
- Two-way VHF radiotelephone for survival craft and SARTs. Since 2024 these requirements are in **Reg IV/7**, moved from SOLAS III/6
- Cargo ships **500 GT and over** and passenger ships carry **2 SARTs**. Cargo ships **300 to under 500 GT** carry **1**

### By sea area (Regs IV/8 to IV/11)
| Area | Required (primary and duplicated) |
|---|---|
| A1 | VHF (IV/7.1.1) |
| A2 | VHF and **MF** (IV/9.1.1) |
| A3 | VHF and either **MF/HF** (IV/11.1.1) or an **RMSS SES** (IV/10.1.1) |
| A4 | VHF and **MF/HF** (IV/11.1.1) |

- MF/HF is no longer primary equipment for A3. It stays primary for A4
- A single MF/HF installation may count as both the MF and the MF/HF installation
- Under COMSAR.1/Circ.32/Rev.3, A3 can be met with four units: 2 VHF, 1 MF/HF and 1 RMSS

### What changed on 1 Jan 2024
| Change | Detail |
|---|---|
| Regulation numbers | Reg 8 is A1 only, Reg 9 is A2, Reg 10 is A3, Reg 11 is A4. Before 2024 each one also covered the lower areas |
| VHF-EPIRB | No longer accepted in place of a satellite EPIRB. A1-only ships need a satellite EPIRB |
| A3 alternative | The old option of VHF, MF/HF and an EPIRB is gone. MF/HF-only A3 ships must fit at least one SES |
| NBDP | Narrow-band direct printing is no longer a GMDSS requirement. HF NBDP can still be kept to receive MSI |
| MSI receivers | **NAVTEX** where an international NAVTEX service is provided in the area. Otherwise an **EGC** receiver (SafetyNET or Iridium SafetyCast) covering the area, under MSC.1/Circ.1645 |
| Performance standards | New VHF and MF/HF DSC standards in MSC.511(105) and MSC.512(105) |

**Transitional rules**
- Equipment installed on or after 1 Jan 2024 must meet the new standards. Under IACS UI SC298, for ships contracted on or after 1 Jan 2024 any installation must meet them
- **1 Jan 2028:** flag States may allow VHF, MF and MF/HF equipment and Inmarsat-C SES approved under the old standards to keep being installed (MSC.1/Circ.1676). The deadline for VHF equipment to follow the revised ITU Appendix 18 channelling is also 1 Jan 2028 (MSC.1/Circ.1460/Rev.4)
- Existing ships get revised certificates at the first radio survey after 1 Jan 2024, whether or not equipment changes. Certificates must also be updated when GMDSS equipment is added or removed

## How a distress alert travels
![[diagram:gmdss-alert|Three ways a distress alert goes out]]

- **DSC** (digital selective calling): the alert identifies the ship in distress and its position. If nobody acknowledges it by DSC, it repeats automatically every few minutes
- **Satellite SES:** sent straight to the rescue coordination centre
- **EPIRB:** the 406 MHz signal goes through Cospas-Sarsat to the rescue coordination centre
- Satellite alerts go directly to the RCC, so nearby ships do not receive them directly

**DSC distress frequencies**
| Band | Frequency |
|---|---|
| VHF | Channel 70, **156.525 MHz** |
| MF | **2187.5 kHz** |
| HF | 4207.5, 6312, 8414.5, 12577 and 16804.5 kHz |

**Voice and priority (ITU Radio Regulations)**
| Level | Signal | Priority |
|---|---|---|
| Distress | **MAYDAY** | Absolute priority over everything |
| Urgency | **PAN PAN** | Below distress, above everything else |
| Safety | **SECURITE** | Below distress and urgency |

- VHF channel 16 is **156.8 MHz**. A ship without DSC should, where practical, start its distress call on channel 16
- The rescue authority may impose radio silence with **SEELONCE MAYDAY**. Stations that are not part of the distress traffic must stay off the frequencies until normal working is announced

## Cospas-Sarsat and the EPIRB
![[diagram:gmdss-cospas|From a 406 MHz beacon to a rescue centre]]

- **406 MHz** is reserved internationally for distress. The EPIRB band is 406 to 406.1 MHz
- Three beacon types: **EPIRB** (maritime), **ELT** (aviation) and **PLB** (personal)
- Each beacon sends a unique **HEX ID**. If the beacon is registered, responders also see the ship, owner and emergency contacts. **Keep your registration current**
- Satellites are in low, medium and geostationary orbit, provided by the United States, the Russian Federation, India and EUMETSAT
- Ground chain: satellite, **LUT** (decodes and calculates the position), national **MCC**, then the **RCC**, which verifies and sends help
- The system has saved **over 50,000** people worldwide since 1982 (NOAA, 2024)
- EPIRB test every year. EPIRB maintenance at intervals of no more than **5 years** (Reg IV/15)

## Maritime safety information (MSI)
### NAVTEX
- International broadcasts on **518 kHz**. Also **490 kHz** (often in a local language) and **4209.5 kHz**
- Designed range about **400 nm**
- IMO designates NAVTEX as the primary means of sending coastal urgent MSI to ships

![[diagram:gmdss-navtex|Reading a NAVTEX message header]]

| B2 | Subject |
|---|---|
| A | Navigational warnings |
| B | Meteorological warnings |
| C | Ice reports |
| D | Search and rescue, piracy warnings, tsunamis and other natural phenomena |
| E | Meteorological forecasts |
| F | Pilot and VTS messages |
| G | AIS service messages |
| L | Other navigational warnings |
| Z | No message on hand |

- Each message starts with a four-character header: **B1** station, **B2** subject, **B3 B4** message number
- The receiver uses B1 and B2 to accept or reject messages, and B3 B4 to avoid repeats
- Signal: narrow-band direct printing with forward error correction (Mode B), 100 baud FSK
- **SafetyNET** (Inmarsat) broadcasts MSI between about 76°N and 76°S. **Iridium SafetyCast** is the equivalent on the Iridium service

## Watches, power and maintenance
![[diagram:gmdss-power|Reserve power, maintenance and watches]]

**Radio watch (Reg IV/12)**
- Continuous DSC watch on **VHF channel 70**
- **2187.5 kHz** if MF DSC is fitted
- **8414.5 kHz** and at least one other HF DSC frequency if HF DSC is fitted
- A listening watch on **channel 16** where practicable
- Distress alerts by satellite if an SES is fitted. MSI by NAVTEX or EGC as fitted

**Reserve source of energy (Reg IV/13)**
- **1 hour** if the ship has a compliant emergency source of power, **6 hours** if not
- Batteries recharge within **10 hours**. Capacity is checked at intervals of no more than **12 months** when the ship is not at sea

**Keeping equipment available (Reg IV/15)**
- A1 and A2 ships use **at least one** method. A3 and A4 ships use **at least two**
- The three methods: **duplication** of equipment, **shore-based maintenance**, **at-sea electronic maintenance** by qualified personnel such as an ETO

**People, position and records**
- **Reg IV/16:** qualified radio personnel. One person is designated to lead distress radiocommunications. Passenger ships also have at least one person doing distress communications only
- **Reg IV/17:** radio incidents important to safety of life are recorded
- **Reg IV/18:** if the navigation receiver fails, update the position by hand at least every **4 hours** while under way
- **UK practice (MGN 641):** radio logs kept 1 year on board, 7 years in total

## What inspectors look at
- The radio certificate, and that equipment matches the area the ship trades in
- EPIRB registration and the last annual test
- Maintenance method for the area (one or two methods)
- Reserve battery capacity
- Operator certificates and the person designated for distress communications
- The radio log

## Related notes
- [[SOLAS 1974]] Chapter IV
- [[SAR 1979]] search and rescue regions
- [[INMARSAT 1976]] and [[International Code of Signals]]
- [[LSA Code]] survival craft radio equipment

## Not included (not verified against the original text)
- Step-by-step distress procedure and cancelling a false alert
- Daily, weekly and monthly equipment test intervals
- Radio operator certificate categories (GOC, ROC) in the STCW Convention
- BeiDou and other satellite services still being recognized
- NAVDAT and VDES, which are still being introduced
- Cospas-Sarsat founding date and the end of 121.5 MHz processing

## Sources (checked 23 Nov 2026)
- IMO, Radiocommunications page: https://www.imo.org/en/ourwork/safety/pages/radiocommunications-default.aspx
- Resolution MSC.496(105), amended SOLAS Chapter IV: https://traficom.fi/sites/default/files/media/file/MSC.496%28105%29.pdf
- Resolution MSC.509(105), GMDSS sea areas and radio services criteria: https://wwwcdn.imo.org/localresources/en/KnowledgeCentre/IndexofIMOResolutions/MSCResolutions/MSC.509(105).pdf
- Bureau Veritas, modernized GMDSS in force 1 Jan 2024: https://marine-offshore.bureauveritas.com/newsroom/modernization-gmdss-entry-force-1-january-2024-amended-solas-chapter-iv
- ABS, amendment to SOLAS Chapter IV: https://ww2.eagle.org/content/dam/eagle/regulatory-news/2024/Amendment-to-SOLAS-Chapter-IV.pdf
- Key points of the modernized GMDSS (TransNav): https://www.transnav.eu/files/Key_Points_of_the_Modernized_GMDSS_System,1284.pdf
- UK MCA, MGN 641 (radiocommunications under SOLAS IV): https://www.gov.uk/government/publications/mgn-641-m-guidance-on-radiocommunications-under-chapter-iv-of-solas/mgn-641-m-guidance-on-radiocommunications-under-chapter-iv-of-solas
- AMSA, GMDSS Handbook 2018: https://www.amsa.gov.au/sites/default/files/gmdss-handbook-2018.pdf
- ITU Radio Regulations, distress and safety chapter: https://life.itu.int/radioclub/rr/chapt-7.pdf
- NAVTEX in the United States (USCG NAVCEN): https://navcen.uscg.gov/node/228
- Cospas-Sarsat system overview (NOAA): https://www.sarsat.noaa.gov/sys-diag.html
- Cospas-Sarsat partnership (NOAA): https://www.sarsat.noaa.gov/cospas-sarsat-partnership/
- Cospas-Sarsat overview 2024 (NOAA): https://www.sarsat.noaa.gov/wp-content/uploads/2024-SAR-WKSHOP_SARSAT-Overview.pdf
