# 13. Acceptance, evidence, and current limits

[Product Spec index](../product-spec.md) · Version 1.3 · Updated 2026-10-24.

The user accepted M6 for submission on 2026-10-24 after the integrated review revisions. This acceptance does not approve deployment or promote the dataset.
M0–M4 are implemented with their recorded acceptance. M5 is release preparation with hosting and publication gates pending.
M6.1–M6.4 are complete within the locally checked and user-accepted scope. Deployment checks remain in M5. The accepted M6 dataset became the default build dataset on 2026-10-24.

Latest recorded checks include 48 three-browser bout/motion checks and three existing Chromium motion checks after the viewport correction.
The preceding control revision records 52 unit tests. Pipeline evidence records 38 checks from M6.2.
These runs have different scopes and dates; do not add them into an invented single fresh full-suite result.
See [validation](../validation.md), [M6 interface report](../m6-interface-report.md), [data report](../m6-data-report.md), and [viewport receipt](../evidence/m6-scroll-validation.json).
No application tests are implied by publishing this consolidated spec.

Known limits:

- The default local pointer and release descriptor now select the accepted M6 dataset. No hosted deployment has occurred.
- Source snapshots can differ in date and coverage; do not present them as live rankings or infer history completeness from career totals.
- Sparse cohorts and unknown source statistics prevent some scores by design.
- Manual assistive-technology review, deployed performance, native frame timing, and release rollback certification are not established by current local browser counts.
- Media identity/role review and publication rights are separate. Release checks must enforce the latter.
