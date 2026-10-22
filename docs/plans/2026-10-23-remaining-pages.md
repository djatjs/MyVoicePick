# Remaining page design

Scope: features, guide, signup, API documentation, checkout, checkout outcome, OAuth progress, not-found, shared footer and navigation.

Use the existing slate/indigo tokens and Korean typography. Replace unsupported marketing statistics and unconnected forms with actual product behavior. Keep guide steps sequential and use native details for FAQs. Document current authenticated endpoints, not a fictional public API.

Share social account UI between login and signup. Share the payment panel between the modal and checkout page. Preserve the modal's 100 KRW test amount and the direct checkout's existing PRO 19000/STUDIO 49000 amounts and approval endpoint. Make amounts explicit, show failures and recovery links, validate callback parameters before submitting, and do not execute payments during verification.

Replace dead footer links with existing routes. Use a storage subscription for nav state and notify same-tab token changes, with server hydration fallback and subscription cleanup tests.

Validation: npm test, npm run lint and production build. Browser review of information pages, signup, missing payment confirmation data, payment setup failure and mobile table overflow. Live OAuth/payment approval is outside the verification performed.
