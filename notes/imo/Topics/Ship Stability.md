---
title: Ship Stability
tags: [stability, gm, gz, metacentric-height, free-surface, angle-of-loll, inclining-test, stability-booklet, intact-stability, topic]
---
# Ship Stability — The basics a deck officer works with

## At a glance
| | |
|---|---|
| **Initial stability** | Judged by the **metacentric height, GM = KM − KG** |
| **Overall stability** | Judged by the **righting arm (GZ) curve**. The righting moment is GZ × displacement |
| **Biggest everyday losses** | **Free surface** in slack tanks, and a **high KG** from the cargo or fuel plan |
| **Rules** | [[IS Code 2008]] (criteria), [[SOLAS 1974]] chapter II-1 (subdivision and damage), [[Load Lines 1966]] (information to the master) |
| **On board** | The Administration-approved **stability booklet** and, where fitted, a **stability instrument** |

> **Key Point:** A ship that meets the numbers on paper can still capsize if the loaded condition is not the one the booklet was calculated for. Check **free surface** and the **real weights** first.

![[diagram:stab-gm|Initial stability, position of G against M]]

## The points and the terms
| Term | Meaning |
|---|---|
| **K** | The keel, the reference point for heights |
| **G** | **Centre of gravity**. All weights act through it. It moves **toward** added weight, **away** from removed weight, and in the **same direction** as a shifted weight |
| **B** | **Centre of buoyancy**, the geometric centre of the underwater hull. It moves with the shape of the underwater hull and with the waterline |
| **M** | **Metacentre**. The point where the lines of buoyancy force meet at **small angles** of heel (roughly under 10°) |
| **KM** | Height of M above the keel. **KM = KB + BM** |
| **BM** | **BM = I / V**. I is the transverse moment of inertia of the waterplane about the centreline, V the displaced volume |
| **GM** | **Metacentric height = KM − KG** (the same as KB + BM − KG). The measure of **initial stability** |
| **GZ** | **Righting arm**. The horizontal distance from G to the line of the buoyancy force |
| **Righting moment** | GZ × displacement. The best measure of **overall** stability |

- At **small angles** GZ is proportional to GM (the initial range, about 0° to 7°–10°)
- A heavier ship floats deeper, so B rises and **M moves down**

## Three states of equilibrium
| State | Position | Result |
|---|---|---|
| **Stable** | **M above G**, GM positive | A righting moment returns the ship upright. A large GM gives a **stiff** ship with a large righting moment at small angles |
| **Neutral** | **M at G**, GM zero | No righting moment |
| **Unstable** | **G above M**, GM negative | The moment becomes a **capsizing** moment |

The other index is the **range of stability**: the angle at which the righting lever falls to zero.

## List and angle of loll
| | **List** | **Angle of loll** |
|---|---|---|
| **Cause** | **Unequal weight** on either side of the centreline | **Negative GM**. Often a large free surface, or lost stability from damaged compartments |
| **Meaning** | The ship sits heeled to one side because of where the weight is | The ship cannot stay upright. It settles at the angle where it is in **neutral equilibrium** (GM zero) |
| **Danger** | Depends on the size | The ship looks steady but is in danger. The source says **rapid remedial action** is needed to prevent capsizing |

## Free surface effect
A partly filled tank lets the liquid move as the ship heels. The result is a **loss of GM**, as if G had risen.

- **Formula:** the metacentric height is reduced by **w′ × I′ / (w × V)**. I′ = L′ × b′³ / 12 is the second moment of area of the liquid surface about its centreline, w′ the specific weight of the liquid, and w × V the ship's displacement weight
- **Breadth cubed:** the loss depends on the **width of the free surface (b³)** and the tank length. It does **not** depend on how much liquid there is. A heavier liquid gives a bigger loss. A bigger displacement gives a smaller loss
- **Divide the tank:** a longitudinal partition reduces the loss. Two equal compartments give **one quarter** of the single-tank loss. This is why tankers use narrow compartments

### What the IS Code requires (Part B, 3.1)
| Rule | Detail |
|---|---|
| **Correction** | GM and the GZ curve are corrected for free surface in **all loading conditions** (3.1.1) |
| **98% rule** | Consider free surface when a tank is **below 98%** full. Nominally full **cargo** tanks are still corrected at the 98% level (3.1.2) |
| **Fixed or variable level** | Fixed level: use the actual level. Variable level: use the **maximum value** within the filling limits (3.1.3) |
| **GZ correction** | Use the actual moment of liquid transfer at each heel angle, or the zero-heel inertia modified at each angle, if the Administration agrees (3.1.9) |
| **Small tanks** | May be left out if **free surface moment ÷ minimum displacement is below 0.01 m**, at **30°** inclination (3.1.12) |

## What the stability criteria are checked against
The numbers (GZ areas, GM of 0.15 m, the weather criterion, passenger and timber rules) are in [[IS Code 2008]]. They are checked on the **loading conditions** below.

| Standard loading condition for a cargo ship (Part B, 3.4.1.2) | Stores and fuel |
|---|---|
| **Fully loaded departure** | Full |
| **Fully loaded arrival** | **10%** remaining |
| **Ballast departure**, no cargo | Full |
| **Ballast arrival**, no cargo | **10%** remaining |

- Fully loaded departure is taken to the **subdivision or summer load line**, with water ballast tanks empty (3.4.2.2)
- Cargo in holds is taken as **homogeneous** unless that does not suit the ship's service (3.4.2.4)
- The owner's own loading conditions are checked first. If the information is not enough, the standard conditions are used (3.3.1, 3.3.2)
- Curves are worked out on a **free-trim** basis, and the trim change caused by heel is included (3.5.1)
- Small openings that submerge only above **30°** are not counted as open (3.5.2.9)
- **Permanent ballast**, if used, is fixed under an approved plan so that it cannot shift (3.2)

## Information on board
**Stability booklet (Part B, 3.6)**
- Every ship has an **Administration-approved booklet** that lets the master comply with the Code (3.6.2)
- Recommended contents include: general arrangement with watertight closures and **down-flooding angles**, hydrostatic and **cross curves** (free-trimming), **tank sounding tables with free surface data**, **loading restriction curves** (maximum KG or minimum GM), standard loading conditions, and the **inclining test report** or a sister-ship report (3.6.4)
- A simplified booklet may be allowed by the Administration (3.6.5)
- A **stability instrument** is installed hardware and software that confirms the booklet requirements in any loading condition. It supplements the booklet and does not replace it. Details in [[IS Code 2008]]

**Definitions used for the lightship (Introduction, section 2)**
| Term | Meaning |
|---|---|
| **Lightship** (2.23) | Ship complete, without consumables, stores, cargo, crew or effects, and with no liquids except machinery and piping fluids at operating level |
| **Lightweight survey** (2.24) | An audit of items to add, deduct or move, to bring the ship back to the lightship condition |
| **Inclining test** (2.22) | Known weights are moved, normally across the ship, and the change in heel is measured to find the **vertical centre of gravity (VCG)** |

## The inclining test (IS Code Part B chapter 8, Annex 1)
**When**
- Every passenger ship, and every cargo ship of **24 m or more**, is inclined **on completion** (8.1.1)
- Re-incline after alterations that materially affect stability (8.1.4)
- Passenger ships: lightweight survey at intervals **not above five years**. Re-incline if the lightship displacement differs by more than **2%** or the LCG by more than **1% of L** (8.1.5)
- The Administration may waive the test for a **sister ship** if the lightship mass is within **2% (L under 50 m)** to **1% (L over 160 m)**, interpolated between, and the LCG within **0.5%** (8.1.2)

**How**
| Item | Rule |
|---|---|
| **Ship** | As complete as possible. Decks free of water, rain, snow and ice (8.2.2) |
| **Tanks** | Empty and clean, or **completely full**. Slack tanks only as an absolute minimum: one port and starboard pair or one centreline tank, **20% to 80%** (deep tanks) or **40% to 60%** (double bottom). Cross-connections closed (Annex 1, 2.1) |
| **Pressed-up tanks** | Must be **completely full**. 98% is not acceptable (2.1.3) |
| **Empty tanks** | Pumping until suction is lost is not enough. Tanks must be **entered and inspected** (2.1.4) |
| **Mooring** | The ship must be **free to list**. Lines slack at each reading. Enough water so the hull stays clear of the bottom (2.2) |
| **Weather** | Wind, current and sea can give a false result. Postpone or move if readings are not accurate |
| **Start** | Ship nearly upright. Up to **half a degree** of list is accepted (8.2.2.7) |
| **Test weights** | Marked with ID and mass. Total weight gives **1° to 4°** of heel to each side. Placed **as far outboard as possible** on the upper deck (8.2.2.8, 2.3) |
| **Pendulums** | Three recommended, at least two. Deflection at least **15 cm** each side. Length generally at least **3 m**, 4 to 6 m recommended. Damping trough filled with liquid (2.4) |
| **Draught** | At least **five freeboard readings** each side, or read all draught marks each side. Take water density samples at depth (4.2) |
| **Weight movements** | Standard test: **eight** movements. If the plot is a straight line after the first zero and six movements, the test is complete (8.4.1.2) |

## Related notes
- [[IS Code 2008]] criteria, weather criterion, special criteria, stability instruments, icing
- [[SOLAS 1974]] chapter II-1 subdivision and damage stability (required index R, attained index A, A ≥ R)
- [[Load Lines 1966]] freeboard and information to the master
- [[Grain Code]] grain stability criteria
- [[Draft Survey]] displacement from the draughts

## Not included (not verified against the original text)
- **Corrective actions** for list and loll, and their order
- The formula for the **shift of G** from added, removed or moved weight, and **GZ = GM × sin θ** as a worked formula. Only the proportionality at small angles is included
- The **inclination angle** used for the GM free-surface correction. The IS Code text read gives 5° in one place (3.1.2) and 0° in another (3.1.8), so no angle is stated
- **Trim**, **parallel sinkage**, **TPC** and **MCT** calculations
- **Damage stability** methods, permeability, and the SOLAS **A and R** formulas
- **Dynamic stability**, **second-generation criteria**, **wind heel** in practice
- The **rule of thumb** that KB is about 52% of draught. One reading gave it as a first estimate only
- **Stability of bulk carriers** and container ships in practice, and **cargo shifting** cases
- The exact **text of Annex 1** after paragraph 4.2.6 (how GM and KG are computed from the readings)

## Sources (checked 23 Nov 2026)
- 2008 IS Code, MSC.267(85) (Part B 3.1 to 3.6, chapter 8, Annex 1, definitions): https://law.resource.org/pub/us/cfr/ibr/inc/imo/imo.msc.267.2008.pdf
- MIT 13.012, Reading 3 (metacentre, KB, KM, BM = I/V, KG, GM): https://web.mit.edu/13.012/www/handouts/2003/Reading3.pdf
- Britannica, Metacentric stability (metacentre, GM, stable and unstable): https://www.britannica.com:443/technology/naval-architecture/Metacentric-stability
- US Navy Damage Control Training, Principles of Stability (G, B, M, GM, GZ, weight effects): https://man.fas.org/dod-101/navy/docs/swos/dca/stg4-01.html
- Wikipedia, Angle of loll (list versus loll): https://en.wikipedia.org/wiki/Angle_of_loll
- CodeCogs, Stability with liquid loads (free surface formula): https://codecogs.com/library/engineering/fluid_mechanics/floating_bodies/stability-with-liquid-loads.php
