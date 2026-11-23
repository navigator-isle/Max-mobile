---
title: Draft Survey
tags: [draft-survey, draught-survey, cargo-weight, displacement, trim-correction, density, hydrostatics, topic]
---
# Draft Survey — Cargo weight from the ship's draft

## At a glance
| | |
|---|---|
| Principle | Archimedes: a floating ship displaces water equal to her own weight. **Cargo = change in displacement**, after the corrections |
| Method | Survey before and after loading or discharging, then compare the net displacements |
| Readings | **Six draft marks**: forward, midships, aft, on port and starboard |
| Accuracy | About **±0.5%** of the cargo figure when done properly |
| Standard | UNECE *Code of uniform standards and procedures for the performance of draught surveys of coal cargoes* (ECE/ENERGY/19, Geneva, 3 Feb 1992) |

![[diagram:draft-steps|The order of work]]

> **Key Point:** Every correction is small, but the errors add up. A wrong density or a missed ballast tank can cost far more than a misread draft.

## Before the survey
- Draft marks painted, visible and unobstructed
- List not more than **0.5°**, and trim small
- Safe access to read the marks, a small boat preferred
- Ballast tanks pressed up or empty, with slack tanks kept to a minimum
- Sounding pipes marked and clear
- Approved hydrostatic tables and tank tables on hand

## Step 1. Read the drafts
![[diagram:draft-marks|Six readings, and the distances to the perpendiculars]]

- Read forward, midships and aft, on **both sides**, and average each pair
- **Fm** = (FP + FS) / 2, **Mm** = (MP + MS) / 2, **Am** = (AP + AS) / 2
- **Apparent trim (AT)** = Am − Fm. Positive means trim by the stern

## Step 2. Correct to the perpendiculars
The marks are not on the perpendiculars. Draft is moved along the trim line to the **FP**, **AP** and midships.

| Item | Formula |
|---|---|
| Length between marks | **LBM** = LBP − (Fd + Ad) |
| Forward correction | **Fc** = Fd × AT / LBM |
| Aft correction | **Ac** = Ad × AT / LBM |
| Corrected drafts | **Fcd** = Fm ∓ Fc, **Acd** = Am ± Ac |
| True trim | **TT** = Acd − Fcd |

- Fd and Ad are the distances from the forward and aft marks to the perpendiculars
- Signs, for marks **inside** the perpendiculars: trim by the **stern**, subtract Fc and add Ac. Trim by the **head**, add Fc and subtract Ac
- The midships correction works the same way, and is zero when the mid mark is at midships

## Step 3. Mean draft
![[diagram:draft-hogsag|Why the middle reading is weighted]]

| Mean | Formula |
|---|---|
| Fore-and-aft mean | **M2** = (Fcd + Acd) / 2 |
| Mean of means | **M3** = (M2 + Mcd) / 2 |
| **Quarter mean** | **M4** = (M3 + Mcd) / 2 = **(Fcd + Acd + 6 × Mcd) / 8** |

- The quarter mean compensates for hull bend (hogging or sagging)
- A plain mean (Fcd + Acd) / 2 is only for a ship with no trim and no bend

## Step 4. Displacement from the tables
- Enter the hydrostatic table at the **quarter mean M4**
- Interpolate if M4 is between tabulated drafts: displacement = value at the lower draft + **TPC × (M4 − lower draft in cm)**
- Take **TPC**, **LCF** and **MCTC** at M4. LCF is positive aft of midships

## Step 5. Trim corrections
| Correction | Formula |
|---|---|
| **First** (tonnes) | **FTc** = TT × TPC × LCF × 100 / LBP |
| **Second** (Nemoto) | **STc** = TT² × dMCTC × 50 / LBP |
| dMCTC | MCTC at (M4 + 0.5 m) − MCTC at (M4 − 0.5 m) |

- **First correction sign:** trim by the stern with LCF aft, or trim by the head with LCF forward, is **added**. The other two cases are **subtracted**
- **Second correction:** always **added**, whichever way the ship is trimmed
- Needed when trim exceeds **LBP / 100**. Small at small trims
- **Displacement corrected for trim** = Disp + FTc + STc

## Step 6. Density correction
- Tables assume seawater at **1.025 t/m³**
- Take a **dock water sample** at the time and measure it with a hydrometer
- **Corrected displacement** = trim-corrected displacement × (measured density / 1.025)

## Step 7. Deductibles and constant
- **Deductibles:** ballast water (including unpumpable), fresh water, fuel oil, diesel oil, lube oil, sludge and bilge, and other known weights such as dunnage and lashing
- **Tank weight** = volume from the sounding table (corrected for trim) × density
- Densities: fresh water **1.000**, seawater ballast **1.025**. Fuel density is given by the Chief Engineer, measured at the time of sounding if possible
- **Constant** = light displacement − lightship − weights − ballast − consumables, found by a survey of the ship in light condition
- Net displacement = corrected displacement − deductibles − constant

## Step 8. Cargo weight
- **Cargo** = net displacement (final) − net displacement (initial)
- For one survey with cargo on board: **Cargo** = corrected displacement − lightship − deductibles − constant

## Worked example (illustrative figures, not a real ship)
LBP 180.0 m, Fd 3.0 m, Ad 6.0 m, so LBM = 171.0 m. Marks are inside the perpendiculars. Mid mark at midships.

| Step | Working | Result |
|---|---|---|
| Fm, Mm, Am | (8.10 + 8.14) / 2, (8.52 + 8.56) / 2, (9.30 + 9.34) / 2 | 8.120, 8.540, 9.320 m |
| Apparent trim | 9.320 − 8.120 | 1.200 m by the stern |
| Fc, Ac | 3.0 × 1.200 / 171 and 6.0 × 1.200 / 171 | 0.021 m, 0.042 m |
| Fcd, Acd | 8.120 − 0.021 and 9.320 + 0.042 | 8.099 m, 9.362 m |
| True trim | 9.362 − 8.099 | 1.263 m |
| Quarter mean | (8.099 + 9.362 + 6 × 8.540) / 8 | **8.588 m** |
| Table values at 8.588 m | Displacement 24,680.0 t, TPC 31.2, LCF 2.40 m aft, dMCTC 8.0 | given |
| First correction | 1.263 × 31.2 × 2.40 × 100 / 180 | **+52.5 t** |
| Second correction | 1.263² × 8.0 × 50 / 180 | **+3.5 t** |
| Trim-corrected displacement | 24,680.0 + 52.5 + 3.5 | 24,736.1 t |
| Density correction | 24,736.1 × (1.019 / 1.025) | 24,591.3 t (−144.8 t) |
| Deductibles | Ballast 3,412.6 + fresh water 186.4 + fuel oil 742.8 + diesel oil 58.2 + lube oil 71.0 | 4,471.0 t |
| Constant, lightship | 210.0 t and 6,800.0 t | given |
| **Cargo** | 24,591.3 − 6,800.0 − 4,471.0 − 210.0 | **13,110.3 t** |

Density alone moved the answer by 144.8 t here, more than any other correction.

## Common sources of error
- Density not measured, or assumed to be 1.025, or a sample from the surface layer only
- Swell, current, or ship movement at an exposed berth; marks hidden by fenders, or a high jetty
- List above 0.5°, or heavy trim
- A tank missed, or sounding pipes not clear
- Wrong table entry or wrong interpolation direction
- Fuel burned or water used between the two surveys, and not recorded
- An out-of-date constant
- Wrong sign on a trim correction. Always check the sign convention of the ship's own table

## Related notes
- [[Tonnage 1969]] gross and net tonnage (a measure of volume, not weight)
- [[Load Lines 1966]] the draft limits for the ship
- [[SOLAS 1974]] carriage of grain and bulk cargoes

## Not included (not verified against the original text)
- The **original UNECE code (ECE/ENERGY/19)**. Only its title, date and symbol are checked. The formulas above agree across published guides, not the code itself
- Section numbers and the exact accuracy wording of the code
- The **Nemoto second correction**: one guide writes the divisor as LBP², two write LBP. The LBP form is used here
- Marks **outside** the perpendiculars, imperial (TPI, MTI) versions, and the deadweight-survey method
- How to find the constant, step by step, and the usual size of a constant
- Tonnes-per-centimetre rules of thumb and the 0.1% accuracy claim
- Charterparty or port rules on who may survey and when

## Sources (checked 23 Nov 2026)
- Draught Survey Book (Canada), ch. 3, procedure and formulas: https://mariners.narod.ru/dsprocedure.html
- Mascot Maritime, draft survey procedure: https://mascotmaritime.com/draft-survey/
- Draft Surveys .com, calculation guide: https://www.draftsurveys.com/en/guides/draft-survey-calculation-guide.html
- UN Digital Library record of ECE/ENERGY/19: https://digitallibrary.un.org/record/168125
- Wikipedia, Draft survey (six marks, principle): https://en.wikipedia.org/wiki/Draft_survey
