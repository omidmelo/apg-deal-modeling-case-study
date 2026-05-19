# Master-Rights Deal Modeling Tool

Build a tool that takes a streaming dataset plus a set of deal levers and
projects the economics of a deal. This is somewhat open ended! Get creative! If you can please pick an artist you think is best and what deal you would offer based on your tool. 

## What's in this folder

```
INSTRUCTIONS.md           <- you are here
data/
├── README.md             <- data dictionary
├── artists.csv           <- 100 artists
└── streaming_data.csv    <- 10 years of daily streams per artist (~22 MB)
```

The data is fictional. All 100 artists are treated as available for a
master-rights deal.

## What to build

A tool that lets a user:

1. Pick an artist from `artists.csv`.
2. See the artist's streams, monthly listeners, catalog vs new-release split,
   and a **data-driven catalog trajectory** (% per month, from the last
   24 months of `catalog_streams`).
3. Configure deal parameters: contract term, advance, marketing budget,
   distribution fee, label/artist split (pre- and post-recoupment),
   recoupment rate, cost of capital, number of new releases, delivery
   window, and a frontline peak/decay profile.
4. See the projected **break-even, recoupment, total ROI, label profit**,
   monthly cash flow with a confidence band, and a catalog vs new-release
   revenue composition.
5. Switch between **best / base / worst** scenarios.

Then point the tool at the roster and have it surface **the artist you'd
recommend signing**, with the metrics that drove the pick.

Stack is your choice

## Notes

- Use **$0.0035 per stream** as the default royalty rate.
- Currency is USD.
- It would be nice if you can host it on a free Vercel plan with a database. (It can be localhost but that would be a plus)



