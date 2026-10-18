# 009 Air City

A system for a municipality to manage rent-control data and see it visualised. Sold to government (B2G).

> **Draft for review.** Built from a one-line brief, so most of it is a proposal for **Mike and Byron to confirm**. Section 10 lists the questions to settle before building.

## Status

Concept stage, planned with Byron as a collaborator. Only the README and CLAUDE.md exist so far.

## 1. Problem statement

*(proposed)* Cities trying to manage rents rarely have reliable data on what rents actually are, how quickly they change or where tenants are under pressure. Without that data, policy is set blind and enforcement can't happen.

## 2. Target audience

*(proposed)*
- **Buyers:** municipal housing departments.
- **Users:** policy analysts and rental-housing officers.
- **Indirect beneficiaries:** tenants.

## 3. Value proposition

*(proposed)* One trusted view of a city's rental market, mapped by area, to set policy and check that it's being followed.

## 4. Core functionality

*(proposed)*
- Bring rent data in from leases, registrations or surveys.
- A map of rent levels and changes by area.
- Flags for increases above a set limit.
- Reports for policy makers.

## 5. Key user journeys

*(proposed)*
1. A housing officer filters the map to one district and sees which buildings had increases above the limit this year.

## 6. Non-goals

*(proposed)*
- Not a tenant–landlord dispute platform in v1.
- Not a property listings site.

## 7. Feasibility

- A dashboard is easy to build.
- Getting the data is the hard part.
- Selling to government involves procurement, long sales cycles and data-protection compliance.

## 8. Assumptions and risks

- **Data access:** where does the rent data come from? Landlords rarely report it voluntarily.
- **Policy:** rent control is legally and politically contested, and the rules differ widely between countries and cities.

## 9. Success metrics

To be decided with Mike and Byron.

## 10. Open questions and challenges

1. **Which city?**
   - South Africa has no general rent control, as far as I know. Berlin has a long history of rent regulation and debate over it.
   - The target city decides the whole product.
2. **What does "Air City" mean?** How does the name connect to rents?
3. **What does Byron bring,** and who leads which part?
4. **Who's the first real user?** Is there someone in a municipality you could show a mock-up to?
5. **Visualiser or system of record?**
   - A visualiser on public data is a fast prototype.
   - A data management system is a regulated product.
   - Which is v1?

## 11. Tech approach

Plain React web app, as decided for the portfolio, since it's a dashboard.

## 12. Roadmap

To be decided.
