# 009 Air City

A data analysis tool to help cities understand what is happening to their housing stock, and in particular how much of it is turning into short-term rentals. The pilot area is Sea Point in Cape Town.

> **Draft for review.** Lines tagged *(proposed)* are Claude's suggestions, not yet agreed. Section 10 lists the questions to settle before building.

## Status

- **Focus: parked.** Not one of the featured prototypes for now.
- **Concept stage.** Next steps:
  - Mike listens to the podcast saved in the Claude Project context.
  - Interview housing activists.
  - Meet the City of Cape Town.
- **Possible collaborator:** Byron, a developer and tech lead in Cape Town with more build experience than Mike.

## 1. Problem statement

Sea Point is quickly turning into short-term rentals for tourists who pay in stronger currencies. Locals are pushed further from affordable housing near jobs and economic opportunity in the city.

The city has a constitutional obligation to work towards sufficient housing for residents, under Section 26 of the South African Constitution. But it has no clear data on how much of its housing stock is rented at affordable rates to residents, compared with how much has become tourist accommodation.

This is a global problem.

## 2. Target audience

- **Buyers:** city councils and housing departments, starting with Cape Town.
- **Users:** housing policy analysts and officials.
- **Data contributors:** homeowners.
- **Beneficiaries:** residents and tenants.
- **Later:** other tourism cities facing the same pressure, such as Barcelona and Berlin.

## 3. Value proposition

A clear, current picture of a neighbourhood's housing stock: how much is long-term and affordable versus short-term and tourist-facing. It helps cities meet their housing obligations and set policy based on evidence.

## 4. Core functionality

- A map and dashboard of housing stock by use:
  - owner-occupied
  - long-term rental (affordable or market rate)
  - short-term rental
- Homeowners submit data: property value, rental price per room per night, and the share of the year they live in the property themselves.
- Incentives for homeowners to submit and confirm their data.
- Trends over time, plus reports for council.

## 5. Key user journeys

1. **Council analyst:** opens Sea Point and sees that X% of units are short-term rentals, how that has changed over two years, and which blocks are changing fastest.
2. **Homeowner:** confirms their property's use and receives an incentive.

## 6. Non-goals

*(proposed)*
- Not an enforcement or penalty system.
- Not a listings platform.
- No individual homeowner data shown publicly; it's shown in aggregate only.

## 7. Feasibility

- **The dashboard is easy to build.** The data is the hard part. The plan needs data access, interviews with activists and a meeting with the city council.
- **Public short-term rental data may exist.** For example, Inside Airbnb publishes listing data for many cities, possibly including Cape Town. A v1 visualiser built on public data could show the problem without anyone having to report.
- **Selling to government** involves procurement, long sales cycles and POPIA compliance.

## 8. Assumptions and risks

- **Self-reported data is weak.** The owners most likely to switch to short-term rental have the least reason to report it accurately. Incentives must outweigh that, or self-reporting needs checking against listing data.
- **What incentive?** For example, a rates rebate. The city would have to fund it, which is a policy decision, not a product feature.
- **Politics:** short-term rental regulation is contested by owners, the tourism industry and activists. You'll need to be seen as neutral and trustworthy.
- **Privacy:** property-level data about people's homes and income is sensitive under POPIA.

## 9. Success metrics

*(proposed)*
- Share of Sea Point housing stock mapped by use.
- Accuracy against a sample check.
- The city adopts it for a policy decision.
- Paying cities after the pilot.

## 10. Open questions and challenges

1. **Public data or self-reporting first?**
   - A visualiser on public listing data could be built and shown to activists and council within weeks.
   - The self-reporting and incentive system needs the city on board first.
2. **What does "Air City" mean?** Is it a reference to Airbnb? Check that the name doesn't cause trademark trouble when pitching to cities.
3. **What's the defensible edge?** Barcelona and Berlin already have short-term rental registration and restriction regimes, and companies such as AirDNA sell data on short-term rentals. Is the edge the affordability and resident-first lens that cities need, rather than market data for investors?
4. **What is Byron's role?** If he joins, does he lead the tech while Mike leads product and the government relationships?
5. **What counts as "affordable"?** Define it, for example relative to local median income, before building anything that measures it.

## 11. Tech approach

Plain React web app, as decided for the portfolio, since it's a dashboard, plus mapping. The backend and data model come later.

## 12. Roadmap

- **Research:** the podcast, then interviews with activists, then a meeting with the City of Cape Town.
- **v1** *(proposed)*: a Sea Point visualiser on public data.
- **v2:** homeowner self-reporting and incentives, piloted with the city.
- **Later:** subscriptions for other cities.
