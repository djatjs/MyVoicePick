# Account and analysis design

Goal: Carry the slate/indigo home design into login, analysis, results and saved records.

- Login: remove unconnected email form; keep existing OAuth provider links with readable labels.
- Analysis: retain upload and polling endpoints, compact accessible file selection, truthful preparation and status messages.
- Result: place artist, similarity and song first; static detail chart, missing-data states and disabled unavailable preview; compact Pro features with existing checkout modal.
- Records: compact account header, latest result and history rows; distinguish fetch failure from empty records; preserve confirmed deletion and subscription access.
- Reuse existing tokens and controls; add no dependencies. Keep data access rules and payment APIs intact.
- Validate missing/full/free/Pro result rendering with Node assertions, then TypeScript, targeted ESLint, build and desktop/mobile browser checks. Authenticated visual checks may use locally rendered test fixtures; never publish fixtures or use fake tokens against production.

Validation: npm test and production build pass. Changed application files and test pass ESLint. Desktop and 390px layouts inspected; result and account-summary components used local example data. Full ESLint still reports 15 errors and 7 warnings in unchanged api-docs, checkout, checkout/success, features, signup, home/PricingSection, MvpNav and TossPaymentModal files. OAuth and real uploads/payments were not executed; local NEXT_PUBLIC_BACKEND_URL is unset.
