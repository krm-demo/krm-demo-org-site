# Chebyshev article — notes for review

Published versions: `docs/chebyshev.en.md` and `docs/chebyshev.ru.md` (pages `site/chebyshev.en.html`, `site/chebyshev.ru.html`).
They were written from the e-mail in this folder. The structure (sections 1–5) is kept; statements got proofs. Several claims of the draft were corrected; they are listed here so a reviewer can check them.

## Corrections to the e-mail draft

1. **Runge phenomenon is about the points, not the basis.** The draft said power polynomials "at K > 6" cause Runge's phenomenon. In least squares, the basis only changes conditioning (same polynomial space). Runge comes from equispaced points with K growing faster than ~√N. Numbers in §1.1 were computed (N = 100 cond table; N = 40 Runge fit).
2. **e^x to machine precision takes ~14 Chebyshev coefficients, not 10–12.** Computed max error: 10 terms 6.0e-10, 12 terms 1.1e-12, 14 terms ≈1e-14. Coefficients are 2·I_k(1).
3. **"Smooth ⇒ exponential decay" was too strong.** Replaced by the C^{p-1}/bounded-variation statement (algebraic decay) and analyticity in a strip (exponential), both proved.
4. **Steam engine, not steam boiler.** Watt's parallel-motion linkage on the steam engine; Chebyshev's 1854 memoir.
5. **Physical meaning of c_0, c_1, c_2** is presented as a loose guide, not as exact statements (c_1 is the projection onto x with the Chebyshev weight, not literally "the slope").
6. **"Uniform grid is optimal on the ring"** is labelled a heuristic (rotation symmetry), not a theorem.

## To verify (sources not opened in full)

- Paris Academy: corresponding member 1860, foreign associate 1874 (English Wikipedia); Brockhaus–Efron gives 1860 for "associé étranger" and says only K. E. von Baer (1876) shared the honour among Russians. The draft's "first Russian after Peter I" claim was **left out**; check before restoring.
- Bertrand's postulate: proved 1850, published 1852 (from memory).
- Memoir presented January 1853, published 1854 (presentation date from history-of-approximation-theory.com snippet).
- References from memory: Rakhmanov, Ann. Math. 165 (2007); Platte–Trefethen–Kuijlaars, SIAM Rev. 53 (2011); Bruno–Lyon, J. Comput. Phys. 229 (2010); Lebesgue constant asymptotics (Trefethen ATAP ch. 15); uniqueness lemma in Rivlin ch. 2.
- Whether the Math-Net.Ru link (rm7033) is the Russian original or the English translation.

## Ideas not done yet

- Figures: Chebyshev points as shadows of equally spaced points on the circle; Gibbs overshoot vs Chebyshev fit of f(x) = x; coefficient decay plots (|c_k| for e^x and Runge's function).
- A small interactive demo (choose N, K, grid) on the page.
