# AirCity

Data analytics for urban ecosystems fighting the ongoing battle against short term rentals, housing crisis pressures and preserving human-centred urban life where it continues to exist.

**Status:** Pre-build. **Target:** working agent demo for ClawCamp Berlin, Thursday 5 November 2026. **Type:** Web app (desktop-first, no mobile app). B2G. **Demo scope:** Sea Point, Cape Town only. **Runtime:** Claude Agent SDK.

> **DRAFT FOR REVIEW.** Items marked [CHALLENGE] are places where I think the original idea needs to change or be defended. Items marked [VERIFY] are facts or licences I have not confirmed. Items marked *(proposed)* are Claude's suggestions, not yet agreed.

**Next steps beyond the demo:**

- Mike listens to the podcast saved in the Claude Project context.
- Interview housing activists.
- Meet the City of Cape Town.

**Possible collaborator:** Byron, a developer and tech lead in Cape Town with more build experience than Mike.

## 1. Problem statement

Short-term rentals (STRs) and apart-hotels have converted long-term housing stock in Sea Point into tourist accommodation, often owned by non-resident buyers and let to tourists who pay in stronger currencies. Long-term residents are priced out and pushed towards the periphery, which weakens access to jobs, schools and infrastructure. The City of Cape Town is considering rules (including a primary-residence requirement for STRs) but has no simple way to see how conditions in a neighbourhood have changed, where they are heading, or what a given rule would change.

It also has no clear data on how much of its housing stock is rented at affordable rates to residents, compared with how much has become tourist accommodation.

This is a global problem.

## 2. Core question the product answers

Where is Sea Point now, where is it heading, and which decisions available to the City keep hotels commercially viable while meeting its constitutional duty to provide housing for local residents?

[CHALLENGE] Treat the trade-off as a hypothesis, not a premise. The brief should test whether hotel viability and resident housing really conflict. Some levers may help both (for example, steering tourist demand into licensed hotels). The agent should report where the two goals conflict and where they do not, and not assume either way.

[VERIFY] Which housing duty applies to the City specifically (Constitution s26 sets the state's duty of progressive realisation; municipal versus provincial versus national functions differ). Get this wording checked before it appears in any government-facing output.

## 3. Target audience

| | Who | Why |
|---|---|---|
| Primary (demo) | City of Cape Town policy analyst or housing/planning official | Needs defensible numbers and a scenario view, quickly |
| Secondary | Councillors, provincial (Western Cape) housing and tourism officials | Consume the brief, not the data |
| Stakeholders (not users) | Hotel and tourism industry, housing NGOs, residents | Their interests appear as metrics in the model |
| Later | Homeowners as data contributors; other tourism cities facing the same pressure, such as Barcelona and Berlin | Better data, then more paying cities |

[CHALLENGE] STR regulation and land use are largely a municipal matter, so I have set the City as the lead audience, with the Western Cape government secondary. Confirm this with someone who works in the sector (the rent-control group guest from the podcast would be a good contact).

## 4. Value proposition

One place to see a neighbourhood's housing and tourism-accommodation history, its likely futures, and the effect of policy options, with every number labelled by source and confidence.

## 5. Demo scope (5 Nov)

Sea Point only, on a single timeline with three zones:

| Zone | Years | Data status |
|---|---|---|
| History | 1990, 2000, 2010, 2020 | Property sale and rental prices: partial. STR prices: see below |
| Now | Current day | Best available live or recent data |
| Scenarios | 2030, 2040 ... 2100 (decade steps) | Modelled, never "forecast" |

Metrics shown across the timeline: rental price, sale price, STR (Airbnb) nightly and implied monthly price, and a displacement-pressure indicator (STR share of stock, rent growth, resident decline).

**Constraints on the timeline ([CHALLENGE])**

- STR data does not go back to 1990. Airbnb launched in 2008 and Cape Town listings only appear in volume from the mid-2010s. The STR line should start where the data starts and show nothing before that. A gap is more honest than a made-up line. [VERIFY] what Inside Airbnb or AirDNA actually cover for Cape Town, and from when.
- Nobody can forecast to 2100. Show scenarios, with the assumptions in view, as a widening range instead of a single line. Decision-relevant horizons are about 2030 to 2050. I suggest 2100 appears only as an "illustrative" toggle, and only for things with real long-range models, such as sea-level rise for a coastal suburb like Sea Point.
- Property24 data is a licence risk. Scraping listings is likely prohibited by its terms of use. [VERIFY]. Alternatives to check: the City's General Valuation roll (public), Deeds data, Lightstone, bank house-price indices, Stats SA, and Property24's published price reports. For the demo, use a small hand-built dataset labelled "illustrative" where real data is unavailable.

## 6. The agent (core functionality for the demo)

**Sea Point Briefing Agent.** A user chooses a year, or picks "now", or picks a policy scenario. The agent runs a visible multi-step workflow and writes a one-page brief.

Workflow (shown step by step in the UI):

1. Retrieve the price series for the chosen period (rent, sale, STR).
2. Compute the displacement-pressure indicator and flag data gaps.
3. Apply the selected policy levers to the scenario model.
4. Compare outcomes on two axes: hotel commercial viability (proxy: occupancy and revenue per available room) and resident housing access (proxy: affordability, long-term stock).
5. Write the brief: where we are, where we're heading, options available to the City, trade-offs, confidence, and what data is missing.

Candidate policy levers (to confirm with a domain expert):

- Primary-residence requirement for STRs (the proposed bylaw)
- Cap or licensing of STR nights per year
- Rates differential for non-resident owners
- Zoning and incentives for hotel development in defined areas
- Inclusionary or affordable housing requirements on new development

Tools the agent can call (each a small function over the demo dataset): `get_series`, `compute_pressure`, `apply_scenario`, `compare_outcomes`, `draft_brief`.

Guardrails: the agent may only cite numbers returned by its tools; every figure carries a source tag and a confidence label (measured, estimated, illustrative); it does not make recommendations beyond the modelled levers.

## 7. Key user journeys

1. **Look back:** the analyst picks 2010 and sees prices and STR presence for Sea Point then, with gaps labelled.
2. **See now:** the analyst sees today's numbers and the pressure indicator.
3. **Look ahead:** the analyst picks a decade (for example 2040) and a baseline versus two policy levers, and sees the ranges diverge.
4. **Get the brief:** the analyst clicks "Brief me" and watches the agent work, then gets a one-page summary they can copy.

## 8. Feasibility

| Area | Assessment |
|---|---|
| Agent workflow in 6 days | Feasible if data is a small fixed dataset |
| Real historical data | Risky; plan on illustrative data for the demo |
| Public STR data | Inside Airbnb publishes listing data for many cities, possibly including Cape Town, so a visualiser could show the problem without anyone having to report |
| Scenario model | Feasible as a simple, transparent calculation; not a validated economic model |
| Map and 3D bars | Out of scope for the demo (phase 2) |
| Selling to government | Involves procurement, long sales cycles and POPIA compliance |

## 9. Success metrics

**Demo:** a stranger can pick a time and a scenario and get a coherent brief in under a minute; every number shows its source tag; the agent's steps are visible.

**Product (later):** an official can answer one specific decision question in under 30 seconds; data coverage and confidence improve per suburb; at least one real stakeholder uses it and gives feedback.

*(proposed)* **Pilot:** share of Sea Point housing stock mapped by use; accuracy against a sample check; the City adopts it for a policy decision; paying cities after the pilot.

## 10. Tech approach

- **Hosting:** Vercel (the personal website is already there).
- **Front end:** a page on the existing site (Next.js or plain React), with charts (Recharts or similar) and a step-by-step view of the agent's work.
- **Agent runtime:** the Claude Agent SDK (the focus of ClawCamp). The Sea Point tools are exposed to the agent as custom tools, and the agent's steps are streamed to the page. [VERIFY] Where it runs: the SDK bundles a Claude Code binary and may not fit a standard Vercel serverless function. Options to test, in order: (a) a small separate backend (Railway, Fly or Render) that the Vercel front end calls, (b) Vercel's sandbox or longer-running compute options, (c) run it locally for the live demo with a recorded fallback. The plain Messages API with tool use stays as the fallback if the SDK can't be hosted in time.
- **API credits:** the SDK uses an API key from the Console organisation that holds the credits, separate from the Claude Pro plan.
- **Model:** Sonnet for the agent run (Haiku if quality is acceptable), to keep cost down.
- **Secrets:** the API key lives only in Vercel environment variables, never in the browser.
- **Cost and abuse control:** a public page that calls a paid API can be run up by anyone. Add a rate limit, a hard spend limit in the Console, and consider a pre-recorded fallback run for the live demo.
- **Data:** CSV or JSON files in the repo, each with `source`, `confidence` and `as_of` fields.

## 11. Assumptions and risks

| Assumption / risk | Mitigation |
|---|---|
| Historical data is obtainable | Use labelled illustrative data for the demo |
| Property24 / Airbnb data can be used legally | Check licences; prefer public or licensed sources |
| The scenario model is credible to officials | Show assumptions, make weights adjustable, call it scenarios |
| A government buyer will accept this framing | Use neutral language (displacement pressure, not "unethical"); keep the ethics framing in the story, not the legend |
| One suburb generalises | Treat Sea Point as a proof of concept and say so |
| Public API key gets abused | Rate limit, spend cap, fallback recording |
| Politics: STR regulation is contested by owners, the tourism industry and activists | Be seen as neutral and trustworthy |
| Self-reported data is weak (phase 1 onwards): the owners most likely to switch to STRs have the least reason to report accurately | Incentives must outweigh that, or check self-reporting against listing data |
| Incentives cost money, for example a rates rebate | The City would have to fund it, which is a policy decision, not a product feature |
| Privacy: property-level data about people's homes and income is sensitive under POPIA | Show no individual homeowner data publicly; aggregate only |

## 12. Non-goals (for now)

- Mobile app
- The citywide or national "ideal city" model and inequality optimisation
- The 3D bar map, topography toggle and currency switching
- The ethical property investment culture idea (separate thesis and audience; parked)
- Any claim of forecasting beyond what the data supports
- *(proposed)* An enforcement or penalty system
- *(proposed)* A listings platform
- *(proposed)* Public display of individual homeowner data

## 13. Open questions

1. Which municipal official or analyst is the first real user, and what single decision do they face?
2. What data can legally be used, and what does it cost?
3. What is the right proxy for "hotel commercial success"?
4. Where does the Agent SDK run for the demo (separate backend, Vercel compute, or local)?
5. Who can sanity-check the policy levers and the constitutional framing?
6. What does "Air City" mean? Is it a reference to Airbnb? Check that the name doesn't cause trademark trouble when pitching to cities.
7. What's the defensible edge? Barcelona and Berlin already have STR registration and restriction regimes, and companies such as AirDNA sell data on STRs. Is the edge the affordability and resident-first lens that cities need, rather than market data for investors?
8. What is Byron's role? If he joins, does he lead the tech while Mike leads product and the government relationships?
9. What counts as "affordable"? Define it, for example relative to local median income, before building anything that measures it.
10. Public data or homeowner self-reporting after the demo? Self-reporting and incentives need the City on board first.

## 14. Roadmap

| Phase | Scope |
|---|---|
| 0. Demo (5 Nov) | Sea Point, illustrative data, agent brief, scenario view |
| 1. Real data | Valuation roll, licensed or public price and STR data for Sea Point; homeowner self-reporting and incentives if the City is on board |
| 2. More suburbs and map | Hex-grid map, desirability score, colour scale, 3D bars |
| 3. Scenario tool | User-adjustable weights for "equitable", city-wide ideal vs actual |
| 4. Pilot | Test with a real City or provincial user |
| Later | Subscriptions for other cities |
