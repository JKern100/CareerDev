// Blog post registry.
//
// Single source of truth for the /blog index, the individual post pages, and
// the sitemap. Keeping the metadata and body together here means the index
// excerpt, the post page <head>, and sitemap.xml can never drift apart.

export const SITE_URL = "https://crewtransition.com";

export interface BlogPost {
  slug: string;
  title: string;
  /** Used for the meta description and the index-page excerpt. */
  metaDescription: string;
  author: string;
  /** ISO date (YYYY-MM-DD). */
  published: string;
  /** ISO date (YYYY-MM-DD). */
  updated: string;
  category: string;
  tags: string[];
  /** Markdown body. The post title is rendered separately as the H1. */
  body: string;
}

const uaeGratuityGuide: BlogPost = {
  slug: "uae-end-of-service-gratuity-cabin-crew-guide",
  title: "UAE End-of-Service Gratuity for Cabin Crew: The Complete 2026 Guide",
  metaDescription:
    "How UAE end-of-service gratuity works for cabin crew in 2026. The formula, worked examples for 4-12 years of service, the 2022 resignation rule change, and the mistakes that cost crew thousands of dirhams.",
  author: "CrewTransition",
  published: "2026-06-01",
  updated: "2026-06-01",
  category: "Transition Planning",
  tags: ["gratuity", "UAE labour law", "financial planning", "cabin crew", "Emirates", "Etihad", "Flydubai"],
  body: `Most cabin crew underestimate their end-of-service gratuity by a wide margin. The reason is structural: gratuity is calculated on *basic* salary, not total monthly pay, and almost no crew keeps the two figures separate in their head. The result is a payout that looks smaller than expected because the planning was based on the wrong number.

This guide walks through how UAE end-of-service gratuity actually works for cabin crew in 2026 — the formula, the calculation, worked examples across different lengths of service, the 2022 rule change that most crew still don't know about, and the mistakes that cost people real money. Everything here is grounded in current UAE labour law as applied to private-sector employees, including cabin crew at Emirates, Etihad, and Flydubai.

A note on scope: this is general guidance based on the federal labour framework. Specific airline contracts can have nuances — particularly around what counts toward "basic" salary and how leave balance is treated. Use this as the baseline understanding; verify the specifics against your contract and your written HR estimate before you make any decisions.

<aside class="blog-callout" role="note">
<p class="blog-callout-title">Scope and limitations</p>
<p>This article reflects general guidance on UAE labour law as of June 2026 and is not legal or financial advice. Specific airline employment contracts may differ in material ways, particularly around what counts toward "basic" salary, notice periods, and leave encashment. The figures cited for Emirates compensation are based on publicly available reporting and may not match your specific contract. Before making any financial or career decisions, verify your situation against your contract, request a written gratuity estimate from your HR department, and consult a qualified UAE labour law professional.</p>
</aside>

## What end-of-service gratuity actually is

End-of-service gratuity (sometimes called "end-of-service benefit" or just "gratuity") is a legally mandated lump-sum payment that UAE private-sector employees receive when they leave their employer, provided they've completed at least one year of continuous service. It's separate from your final salary, leave balance encashment, or any contractual bonuses — it's a statutory entitlement.

The legal foundation is **Federal Decree-Law No. 33 of 2021**, which came into effect in February 2022 and replaced the older Labour Law (Federal Law No. 8 of 1980). Cabin crew employed by UAE-licensed airlines fall under this framework regardless of nationality.

The simplest way to think about it: every year you work, the UAE labour system credits you with a portion of basic salary in a notional account. When you leave, the airline pays that balance out in a single transfer. The longer you stay, the higher the rate of accrual.

## The calculation, step by step

The formula has four moving parts. Most crew get tripped up on the first one — the definition of basic salary — so we'll spend time there.

### Step 1: Identify your basic salary

Your *basic* salary is the figure in your contract under that specific heading. It is **not** your total monthly cash. For an Emirates Grade II cabin crew member in 2026, basic salary is approximately **AED 4,260 per month**.<a id="cite-1" href="#ref-1" class="footnote-ref" aria-label="Footnote 1"><sup>1</sup></a> Total monthly cash for that same crew member typically lands between AED 10,000 and AED 12,000 — the difference being flying pay (around AED 60-70 per flying hour over 80-90 flying hours per month)<a id="cite-2" href="#ref-2" class="footnote-ref" aria-label="Footnote 2"><sup>2</sup></a> and layover allowances. Gratuity is calculated only on the AED 4,260, not the AED 10-12k.

This distinction is the single biggest source of gratuity miscalculation. If you remember nothing else from this guide, remember: gratuity is on basic.

### Step 2: Calculate your daily rate

Divide your monthly basic by 30. For Emirates Grade II at AED 4,260: daily rate is **AED 142**.<a id="cite-3" href="#ref-3" class="footnote-ref" aria-label="Footnote 3"><sup>3</sup></a>

### Step 3: Calculate days of gratuity owed

This is where the rule has two tiers:

- **Years 1 through 5**: 21 days of basic salary per year of service
- **Years 6 onwards**: 30 days of basic salary per year of service

The increase at year 5 is significant — it represents a ~43% jump in the accrual rate. We'll come back to this in the next section.

### Step 4: Multiply days by daily rate

Days owed × daily rate = total gratuity.

That's the entire formula. The math is straightforward; the dirhams add up because of how long crew typically stay.

## Worked examples: what crew actually receive

The examples below use Emirates Grade II basic salary (AED 4,260/month) as the reference. Higher grades scale the same formula against a higher basic. Etihad and Flydubai use slightly different pay structures but the underlying gratuity formula is identical — only the basic salary input changes.

### Example 1: 4 years of service

- Days owed: 21 × 4 = **84 days**
- Daily rate: AED 142
- **Total gratuity: AED 11,928**

### Example 2: 5 years of service

- Days owed: 21 × 5 = **105 days**
- Daily rate: AED 142
- **Total gratuity: AED 14,910**

### Example 3: 8 years of service

- Years 1-5: 21 × 5 = 105 days
- Years 6-8: 30 × 3 = 90 days
- Total days: **195 days**
- Daily rate: AED 142
- **Total gratuity: AED 27,690**

### Example 4: 12 years of senior service

- Years 1-5: 21 × 5 = 105 days
- Years 6-12: 30 × 7 = 210 days
- Total days: **315 days**
- Daily rate: AED 142
- **Total gratuity: AED 44,730**

Senior crew at higher grades (with higher basic salaries) receive proportionally more. A Senior Flight Steward or Cabin Supervisor with 15+ years at a basic of AED 6,000-7,000 can see gratuity figures in the AED 70,000-90,000 range.<a id="cite-4" href="#ref-4" class="footnote-ref" aria-label="Footnote 4"><sup>4</sup></a>

## The 5-year cliff

The 21-day to 30-day jump at year 5 is the single most important timing consideration in transition planning. Leaving at four years and eleven months versus five years and one month meaningfully changes your gratuity calculation — and over a long career, the difference compounds.

Visualised:

| Years of service | Days per year (years 1-5) | Days per year (years 6+) | Cumulative days |
|------------------|---------------------------|--------------------------|-----------------|
| 4                | 21                        | —                        | 84              |
| 5                | 21                        | —                        | 105             |
| 6                | 21                        | 30                       | 135             |
| 8                | 21                        | 30                       | 195             |
| 10               | 21                        | 30                       | 255             |
| 15               | 21                        | 30                       | 405             |

If your potential resignation timeline is anywhere near a five-year milestone, the timing question matters more than you think. Crossing into year 5+1 day before resigning adds a year's worth of higher-rate accrual that you'd otherwise leave on the table.

## Resignation versus termination: the 2022 rule change

Under the old Labour Law (pre-2022), resigning employees received a reduced gratuity compared to terminated employees. Specifically, resignation within the first 1-5 years often meant receiving only one-third to two-thirds of the otherwise-owed amount. This led to a lot of crew either staying longer than they wanted to (to avoid the reduction) or trying to engineer scenarios where termination would be initiated by the employer.

That rule was abolished. Under **Federal Decree-Law No. 33 of 2021**, in force since February 2022, resigned employees receive the **same full gratuity** as terminated employees, provided they've completed at least one year of service and aren't dismissed for gross misconduct under the specified causes.

This change has been law for nearly four years and is well-established. If you encounter older online guidance suggesting resignation reduces your gratuity, that information is out of date. Don't make a decision based on it.

## The two-year cap

Total gratuity is capped at **two years of basic salary**. For Emirates Grade II at AED 4,260/month, that ceiling is AED 102,240. Most crew never hit it — the cap only becomes relevant after roughly 17-18 years of service. Worth knowing it exists; rarely worth planning around.

## Common mistakes that cost crew real money

In our work with crew at various transition stages, the same gratuity-related mistakes come up repeatedly.

**Mistake 1: Confusing basic with total monthly cash.** As discussed in Step 1. If you're modelling your transition financial runway against a gratuity number calculated on AED 10-12k instead of AED 4,260, you're off by 60-70 percent. The number you actually receive will be much smaller than the number you planned for.

**Mistake 2: Resigning days before a milestone.** Particularly the 5-year mark, but also annual increments if your contract structure includes them. If you're within three months of a milestone that affects your gratuity, the calendar matters more than the calendar feels like it should.

**Mistake 3: Not getting a written estimate from HR.** UAE labour law requires your employer to provide a written gratuity estimate on request. Crew often submit their resignation first and learn the actual number afterwards. The order should be reversed: get the estimate, then decide.

**Mistake 4: Not factoring in leave balance encashment.** Unused annual leave is paid out separately from gratuity, but the two together form your transition runway. Crew often forget that 25-30 days of accumulated leave at full pay is a meaningful amount on top of the gratuity figure.

**Mistake 5: Not knowing about the basic-only rule.** Some crew assume housing allowance, transport allowance, or other contractual additions are included in basic for gratuity purposes. They aren't. Only the "basic salary" line item in your contract counts.

## How to get your number

The cleanest path is a single email to HR, before you make any decisions. Suggested wording:

> *"Could I request a written end-of-service gratuity estimate calculated as of [specific date — typically 30-60 days out]? I'd like to confirm the figure for personal financial planning purposes."*

Two things to know:

- Your employer is required to provide this estimate. You don't need to give a reason beyond "financial planning."
- Get it in writing (email is fine). Keep it.

Once you have the estimate, you can model your full transition runway accurately. Gratuity, plus leave encashment, plus any final salary owed, equals the lump sum that lands in your account after your last day. That's your runway for the next chapter.

## Where gratuity fits in your transition plan

Gratuity is a runway, not a paycheck. The most common error in transition planning is treating it as if it can sustain a household for two years; the second most common error is treating it as if it can't sustain anything at all.

For most Emirates Grade II crew at 8 years of service, gratuity (~AED 27,000) plus leave balance encashment (typically another AED 3,000-5,000) plus the final month's pay equals roughly 4-6 months of conservative living expenses in Dubai. For senior crew at 12-15 years, it's closer to 8-12 months.

That window is what transition planning is actually about. It determines whether you can take time to find the right next role, or whether you need to land somewhere quickly. It determines whether you can invest in a credential or certification before transitioning, or whether you need to start a paid role immediately. It determines whether you have negotiating leverage on your next salary, or whether you'll accept the first offer.

Knowing your gratuity number is the first step in any serious transition financial plan. Everything downstream from credential investment to timing the resignation to negotiating the next offer depends on it.

## Frequently asked questions

**Q: Does gratuity apply if I'm terminated for misconduct?**
The 2021 law specifies a narrow set of misconduct grounds (Article 44)<a id="cite-5" href="#ref-5" class="footnote-ref" aria-label="Footnote 5"><sup>5</sup></a> under which gratuity can be forfeited. These are serious — assault, theft, gross negligence, disclosure of trade secrets — and don't apply to ordinary performance issues or contract disagreements.

**Q: Do allowances count toward basic salary?**
No. Housing allowance, transport allowance, flying pay, layover allowances — none count toward "basic" for gratuity purposes. Only the basic salary line item in your contract.

**Q: How is gratuity paid out?**
As a lump sum, typically along with your final salary and any leave encashment, within 14 days of your last working day.<a id="cite-6" href="#ref-6" class="footnote-ref" aria-label="Footnote 6"><sup>6</sup></a> The currency is dirhams, and there are no UAE income taxes on it (or on any other UAE salary income).

**Q: What if I transfer to a new employer in the UAE — do I lose my gratuity?**
You receive your gratuity from the original employer at the end of your employment with them. Your tenure resets at the new employer. There's no "portable" gratuity that moves with you between airlines.

**Q: What if I have less than one year of service?**
No gratuity is owed for under one year of continuous service. Some employers pay a pro-rated discretionary amount, but it's not statutorily required.

**Q: Do I pay tax on gratuity?**
No. The UAE doesn't levy personal income tax on residents. If you're relocating to a country that does (the UK, US, EU, Australia, etc.), tax treatment in your destination country may apply — verify with a cross-border tax advisor.

## In short

The math is straightforward, but the strategic implications aren't. Three things worth holding onto:

1. **Gratuity is calculated on basic salary only**, which is far smaller than total monthly cash. For Emirates Grade II in 2026, that's approximately AED 4,260, not AED 10-12k.
2. **The 21-day to 30-day jump at year 5** is the most important timing consideration in transition planning. If you're near a five-year milestone, the calendar matters.
3. **Since February 2022, resignation and termination are treated equally** for gratuity purposes. The old reduction-for-resignation rule was abolished.

Before any transition decision, get a written gratuity estimate from HR. That number is the foundation everything else is built on.

---

## References and notes

<ol class="footnotes">
<li id="ref-1">The AED 4,260 basic salary figure for Emirates Grade II cabin crew in 2026 is derived from publicly reported aviation compensation analyses (including Aviation A2Z, Wings Institute, and similar industry sources). Actual basic salary may vary by hire date, contract revision, grade progression, and specific role. Verify your figure against your most recent pay statement. <a href="#cite-1" class="footnote-back" aria-label="Back to reference 1 in text">↩</a></li>
<li id="ref-2">Flying pay rates and typical monthly flying hours are reported industry averages and vary by aircraft type, route mix, and contract version. Confirm your specific rate and average hours from your payslip records. <a href="#cite-2" class="footnote-back" aria-label="Back to reference 2 in text">↩</a></li>
<li id="ref-3">Daily rate is calculated as basic monthly salary divided by 30, per UAE Labour Law convention. If your basic salary differs from the AED 4,260 figure used as the example, your daily rate will scale proportionally. <a href="#cite-3" class="footnote-back" aria-label="Back to reference 3 in text">↩</a></li>
<li id="ref-4">Senior crew gratuity figures in the AED 70,000-90,000 range are illustrative estimates based on a Senior Flight Steward or Cabin Supervisor at 15+ years of service with a basic salary in the AED 6,000-7,000 range. Specific outcomes will depend on your actual basic salary, tenure, and any applicable contract provisions. <a href="#cite-4" class="footnote-back" aria-label="Back to reference 4 in text">↩</a></li>
<li id="ref-5">Article 44 of Federal Decree-Law No. 33 of 2021 lists the specific grounds for summary termination without end-of-service benefits. The article enumerates serious misconduct categories; refer to the official Arabic and English texts of the Federal Decree-Law for the authoritative list. <a href="#cite-5" class="footnote-back" aria-label="Back to reference 5 in text">↩</a></li>
<li id="ref-6">The 14-day final payment timeframe is the standard UAE Labour Law provision under Federal Decree-Law No. 33 of 2021. Employer practice may vary in narrow cases; the law sets this as the maximum permissible delay for final payments. <a href="#cite-6" class="footnote-back" aria-label="Back to reference 6 in text">↩</a></li>
</ol>

---

*CrewTransition helps UAE cabin crew plan what's next — including the full financial picture beyond gratuity. The [free assessment](/) maps your specific situation across visa, pay, and pathway compatibility, with realistic timelines and credential recommendations. Start at crewtransition.com.*`,
};

export const blogPosts: BlogPost[] = [uaeGratuityGuide];

export function getAllPosts(): BlogPost[] {
  // Newest first.
  return [...blogPosts].sort((a, b) => (a.published < b.published ? 1 : -1));
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}
