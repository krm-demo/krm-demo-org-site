# My balances sing romances

*Balances Equilibrium: how much money a cash sweep moves for every balance of the current account, drawn by a Java library as one SVG that is an icon on a phone and a full graph on a laptop, and tested by pictures you can scroll through. With links to the exact lines of code that do it.*

**The short version.** A [demo page](https://krm-demo.github.io/ai-plans-instr/plans-math/) lets you drag the handles and watch the money move. A [demo tests page](https://krm-demo.github.io/ai-plans-instr/plans-math/demo-tests.html) shows the same without dragging anything: about 170 balances, each with its status, its amount and its picture at three sizes. Both are rebuilt by [GitHub Actions](https://github.com/features/actions){: .tech} on every push, from code that fits in a few files.

## 1. What the balances sing about

A *cash sweep* keeps the balance $x$ of a current account (a DDA, a demand deposit account) in a comfortable range by moving money between it and an investment account. Too little money: some comes **In**. Too much: the excess goes **Out**. In between, nobody moves, and the balances hum quietly to themselves. That is the romance.

Six numbers describe a sweep:

| Symbol | In the code | Meaning |
| --- | --- | --- |
| $T_{\min}$, $T_{\max}$ | `thresholdMin`, `thresholdMax` | the comfortable range; one target balance $T$ when they are equal |
| $\tau_{\min}$, $\tau_{\max}$ | `nominalMin`, `nominalMax` | the smallest transfer worth making: below it, not worth the stamp |
| $A$ | `sweptInMax` | what the investment account has: more cannot come back |
| $L$ | `sweptOutMax` | the largest single payment the investment account accepts |

And the swept amount $y$ for a balance $x$:

$$
y(x) = \begin{cases}
A & x < T_{\min} - A \\
T_{\min} - x & T_{\min} - A \le x \le T_{\min} - \tau_{\min} \\
0 & T_{\min} - \tau_{\min} < x < T_{\max} + \tau_{\max} \\
x - T_{\max} & T_{\max} + \tau_{\max} \le x \le T_{\max} + L \\
\nexists & x > T_{\max} + L
\end{cases}
$$

Two statuses end the song: Swept **In** Zero (money is needed, but $A = 0$) and Swept **Out** Overflow (more than $L$ would have to go). Both are drawn the same dirty red with the ground mark ⏚: no money moves in either, and the plan needs a human. The whole of it is [one method of twelve lines](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/main/java/org/krmdemo/plansinstr/equilib/Sweep.java#L68).

## 2. The demo page

The [demo page](https://krm-demo.github.io/ai-plans-instr/plans-math/) is a small JavaScript widget: drag the thresholds, the nominals, $A$ and $L$, move the purple probe along the balance, and the status line, the slices and the formula follow; the formula is typeset by [KaTeX](https://katex.org/){: .tech}. Every slice is named, and every boundary belongs to someone: the point where Swept **In** Partial meets Swept **In** Full is filled with the colour of the owner and ringed with the colour of the other.

How do you show who owns an *edge* between two coloured slices? With a trick of the eye: the side whose shading turns away at the edge, like the side of a log, looks nearer, and the edge looks like its own; the neighbour is simply cut off there. Every boundary on the graph is shaded that way, [in about forty lines](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/main/java/org/krmdemo/plansinstr/equilib/SvgRenderer.java#L666).

## 3. One picture, six sizes

The Java library, [plans-math](https://github.com/krm-demo/ai-plans-instr/tree/main/plans-math){: .tech}, draws the same graph without a line of JavaScript. Its [`render(sweep)`](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/main/java/org/krmdemo/plansinstr/equilib/SvgRenderer.java#L100) returns *one* SVG with six pictures inside, and the SVG picks one [by its own width](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/main/resources/templates/equilib.svg#L16-L22):

```css
@media (max-width:79.98px){.icon-s{display:inline}}
@media (min-width:80px) and (max-width:199.98px){.icon{display:inline}}
@media (min-width:200px) and (max-width:339.98px){.tMINI{display:inline}}
@media (min-width:340px) and (max-width:539.98px){.tS{display:inline}}
@media (min-width:540px) and (max-width:739.98px){.tM{display:inline}}
@media (min-width:740px){.tL{display:inline}}
```

Below 80 pixels it is a little cart; below 200 the cart gets a dollar in it; then the coloured slices alone; then the graph for a phone, a tablet and a laptop, each with [more detail](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/main/java/org/krmdemo/plansinstr/equilib/SvgRenderer.java#L43). Media queries inside an SVG answer to the size of the SVG itself, so the same file works in an `<img>`, in a README and opened on its own.

The purple probe moves with the mouse, still without JavaScript: the picture holds a few dozen *frames*, one per sampled balance, and [a line of CSS](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/main/resources/templates/equilib.svg#L23) shows the frame under the mouse.

The markup is a [Thymeleaf](https://www.thymeleaf.org/){: .tech} template in XML mode: Java computes the geometry and hands over plain maps and lists, the template walks them with `th:each` and [picks the shape with `th:switch`](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/main/resources/templates/equilib.svg#L77). No `StringBuilder` draws the picture.

## 4. Who renders what

| What | Who renders it | Where it lives |
| --- | --- | --- |
| The pictures | [`SvgRenderer`](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/main/java/org/krmdemo/plansinstr/equilib/SvgRenderer.java#L100) + the template [`equilib.svg`](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/main/resources/templates/equilib.svg#L73) | the library itself |
| The demo page | [`DemoPage`](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/test/java/org/krmdemo/plansinstr/equilib/DemoPage.java#L41) fills the Thymeleaf template [`index.html`](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/site/index.html): the status list, the numbers of the tests and the coverage; the [widget](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/site/swept-amount-math.js) is copied as it is | `plans-math/` on GitHub Pages |
| The demo tests page | [JUnit](https://junit.org/){: .tech} runs the [demo tests](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/test/java/org/krmdemo/plansinstr/equilib/SweepDemoTest.java#L27), each one [saves its picture](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/test/java/org/krmdemo/plansinstr/equilib/DemoPictures.java#L25); [`DemoPage`](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/test/java/org/krmdemo/plansinstr/equilib/DemoPage.java#L87) collects them into [`demo-tests.html`](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/site/demo-tests.html#L40-L50) | `plans-math/demo-tests.html` |
| Publishing | [the workflow](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/.github/workflows/plans-math.yml#L72) adds the test reports, the [JaCoCo](https://www.jacoco.org/jacoco/){: .tech} coverage and the JavaDoc, and commits everything to the `gh-pages` branch | [GitHub Pages](https://pages.github.com/){: .tech} |

[Maven](https://maven.apache.org/){: .cmd} runs it all in one `mvn verify`: the [demo tests in an execution of their own](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/pom.xml#L99), then [the page generator](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/pom.xml#L168) after the coverage report. The [Open Test Reporting](https://github.com/ota4j-team/open-test-reporting){: .tech} format of JUnit keeps the results and the pictures; its own viewer is still there, but the page you will want is ours.

## 5. Demo tests: for those too lazy to drag

A demo test is a test whose result you look at. Each one takes a set of parameters and a balance, checks the status and the amount against [the rules written once more](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/test/java/org/krmdemo/plansinstr/equilib/DemoCases.java#L181), independently of the library, and publishes the picture at that balance at three sizes side by side. The [demo tests page](https://krm-demo.github.io/ai-plans-instr/plans-math/demo-tests.html) is then a catalogue: change a colour or a font, push, scroll, and every case shows the change at once.

Which cases? Not all of them: there are infinitely many balances. Four plain rules choose them ([the code](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/test/java/org/krmdemo/plansinstr/equilib/DemoCases.java#L63)):

- **Kinds of parameters**: thresholds apart or one target; a nominal zero or not; $A$ zero, equal to $\tau_{\min}$ or larger; $L$ equal to $\tau_{\max}$, larger, or in millions.
- **Pairs, not every combination**: every pair of kinds meets in some set, which takes 19 sets instead of 60, in six groups.
- **Inside and on the edge**: one balance inside every status and one exactly on every boundary.
- **Nothing twice**: a balance stays only if its picture shows something new; Swept **Out** at 75 thousand shows nothing that 80 thousand did not ([the code](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/test/java/org/krmdemo/plansinstr/equilib/DemoCases.java#L96)).

Every name is written as on the graph: `threshold: −$8k [$40k ; $60k] +$10k · A $25k · L $30k`, then `x = $32k = Tₘᵢₙ − τₘᵢₙ → Swept In Full $8k`, in increasing balance.

## 6. What is ours here

To be fair, every piece on its own is well known: media queries inside an SVG, interactivity in pure CSS, Thymeleaf templates, pictures as test results, catalogues of every state of a component. What we have not seen put together is the rest: one SVG as a whole family of pictures, from an icon to a laptop, with its geometry computed in Java and its markup in a template; a mouse-driven probe made of pre-computed frames, still without JavaScript; and tests that photograph themselves, chosen so that every picture shows something new and named in the notation of the graph, collected into one page to scroll. That is the part we are proud of.

## 7. Why "krm-demo"

Because the first three consonants of the author's surname are K, R and M, and everything here is a demo: ideas tried in the open, with no tie to any real system, before they go to work somewhere else. The romances are the balances' own.

## References

- The [demo page](https://krm-demo.github.io/ai-plans-instr/plans-math/) and the [demo tests](https://krm-demo.github.io/ai-plans-instr/plans-math/demo-tests.html)
- The [code](https://github.com/krm-demo/ai-plans-instr/tree/main/plans-math) and its [README](https://github.com/krm-demo/ai-plans-instr/blob/main/plans-math/README.md), with the build and how the Thymeleaf template works
- The [JavaDoc](https://krm-demo.github.io/ai-plans-instr/plans-math/apidocs/index.html), the [technical tests](https://krm-demo.github.io/ai-plans-instr/plans-math/tests/tech/index.html) and the [coverage](https://krm-demo.github.io/ai-plans-instr/plans-math/jacoco/index.html)
