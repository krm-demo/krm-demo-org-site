# Мои балансы поют романсы

*Равновесие балансов: сколько денег переводит cash sweep при каждом балансе текущего счёта. Рисует это Java-библиотека одним SVG, который на телефоне становится иконкой, а на ноутбуке — полным графиком. Проверяется всё картинками, которые можно просто листать. Со ссылками на те самые строки кода.*

**Коротко.** На [демо-странице](https://krm-demo.github.io/ai-plans-instr/plans-math/) можно двигать ручки и смотреть, как ходят деньги. На [странице демо-тестов](https://krm-demo.github.io/ai-plans-instr/plans-math/demo-tests.html) то же самое, но ничего двигать не надо: около 170 балансов, у каждого статус, сумма и картинка в трёх размерах. Обе страницы пересобирает [GitHub Actions](https://github.com/features/actions){: .tech} при каждом пуше, из кода, который помещается в несколько файлов.

## 1. О чём поют балансы

*Cash sweep* держит баланс $x$ текущего счёта (DDA, demand deposit account) в удобных рамках, перекладывая деньги между ним и инвестиционным счётом. Денег мало — часть приходит (**In**). Слишком много — излишек уходит (**Out**). А посередине никто никуда не ходит, и балансы тихонько напевают себе под нос. Это и есть романс.

Sweep задают шесть чисел:

| Символ | В коде | Смысл |
| --- | --- | --- |
| $T_{\min}$, $T_{\max}$ | `thresholdMin`, `thresholdMax` | удобные рамки; когда они равны — один целевой баланс $T$ |
| $\tau_{\min}$, $\tau_{\max}$ | `nominalMin`, `nominalMax` | минимальный перевод, ради которого стоит стараться; меньше — не стоит и марки |
| $A$ | `sweptInMax` | сколько есть на инвестиционном счёте: больше не вернётся |
| $L$ | `sweptOutMax` | самый большой разовый платёж, который инвестиционный счёт примет |

А сумма перевода $y$ для баланса $x$:

$$
y(x) = \begin{cases}
A & x < T_{\min} - A \\
T_{\min} - x & T_{\min} - A \le x \le T_{\min} - \tau_{\min} \\
0 & T_{\min} - \tau_{\min} < x < T_{\max} + \tau_{\max} \\
x - T_{\max} & T_{\max} + \tau_{\max} \le x \le T_{\max} + L \\
\nexists & x > T_{\max} + L
\end{cases}
$$

Два статуса обрывают песню: Swept **In** Zero (деньги нужны, но $A = 0$) и Swept **Out** Overflow (уйти должно больше, чем $L$). Оба нарисованы одним и тем же грязно-красным со значком заземления ⏚: ни в одном деньги не двигаются, и плану нужен человек. Всё это — [один метод в двенадцать строк](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/main/java/org/krmdemo/plansinstr/equilib/Sweep.java#L68).

## 2. Демо-страница

[Демо-страница](https://krm-demo.github.io/ai-plans-instr/plans-math/) — небольшой виджет на JavaScript. Двигайте пороги, номиналы, $A$ и $L$, водите фиолетовую пробу по балансу, и за ними идут строка статуса, полосы и формула; формулу набирает [KaTeX](https://katex.org/){: .tech}. У каждой полосы есть имя, и у каждой границы есть хозяин: точка, где Swept **In** Partial встречается со Swept **In** Full, закрашена цветом хозяина и обведена цветом соседа.

А как показать, кому принадлежит *граница* между двумя цветными полосами? Обманом зрения: та сторона, чья светотень у края заворачивает, как бок бревна, кажется ближней, и граница кажется её собственной; сосед там просто обрезан. Так затенена каждая граница на графике, [примерно в сорок строк](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/main/java/org/krmdemo/plansinstr/equilib/SvgRenderer.java#L666).

## 3. Одна картинка, шесть размеров

Java-библиотека [plans-math](https://github.com/krm-demo/ai-plans-instr/tree/main/plans-math){: .tech} рисует тот же график без единой строчки JavaScript. Её [`render(sweep)`](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/main/java/org/krmdemo/plansinstr/equilib/SvgRenderer.java#L100) возвращает *один* SVG с шестью картинками внутри, и SVG сам выбирает нужную [по своей собственной ширине](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/main/resources/templates/equilib.svg#L16-L22):

```css
@media (max-width:79.98px){.icon-s{display:inline}}
@media (min-width:80px) and (max-width:199.98px){.icon{display:inline}}
@media (min-width:200px) and (max-width:339.98px){.tMINI{display:inline}}
@media (min-width:340px) and (max-width:539.98px){.tS{display:inline}}
@media (min-width:540px) and (max-width:739.98px){.tM{display:inline}}
@media (min-width:740px){.tL{display:inline}}
```

Меньше 80 пикселей — маленькая тележка; меньше 200 — в тележке появляется доллар; дальше — одни цветные полосы; дальше — график для телефона, планшета и ноутбука, и [подробностей всё больше](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/main/java/org/krmdemo/plansinstr/equilib/SvgRenderer.java#L43). Медиа-запросы внутри SVG отвечают на размер самого SVG, поэтому один и тот же файл работает и в `<img>`, и в README, и открытый сам по себе.

Фиолетовая проба ходит за мышью — и всё ещё без JavaScript: в картинке несколько десятков *кадров*, по одному на баланс, и [одна строчка CSS](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/main/resources/templates/equilib.svg#L23) показывает кадр под мышью.

Разметка — шаблон [Thymeleaf](https://www.thymeleaf.org/){: .tech} в режиме XML: Java считает геометрию и отдаёт обычные Map и List, шаблон обходит их через `th:each` и [выбирает фигуру через `th:switch`](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/main/resources/templates/equilib.svg#L77). Никакой `StringBuilder` картинку не рисует.

## 4. Кто что рендерит

| Что | Кто рендерит | Где живёт |
| --- | --- | --- |
| Картинки | [`SvgRenderer`](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/main/java/org/krmdemo/plansinstr/equilib/SvgRenderer.java#L100) + шаблон [`equilib.svg`](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/main/resources/templates/equilib.svg#L73) | в самой библиотеке |
| Демо-страница | [`DemoPage`](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/test/java/org/krmdemo/plansinstr/equilib/DemoPage.java#L41) заполняет шаблон Thymeleaf [`index.html`](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/site/index.html): список статусов, число тестов и покрытие; [виджет](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/site/swept-amount-math.js) копируется как есть | `plans-math/` на GitHub Pages |
| Страница демо-тестов | [JUnit](https://junit.org/){: .tech} запускает [демо-тесты](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/test/java/org/krmdemo/plansinstr/equilib/SweepDemoTest.java#L27), каждый [сохраняет свою картинку](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/test/java/org/krmdemo/plansinstr/equilib/DemoPictures.java#L25); [`DemoPage`](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/test/java/org/krmdemo/plansinstr/equilib/DemoPage.java#L87) собирает их в [`demo-tests.html`](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/site/demo-tests.html#L40-L50) | `plans-math/demo-tests.html` |
| Публикация | [workflow](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/.github/workflows/plans-math.yml#L72) добавляет отчёты тестов, покрытие [JaCoCo](https://www.jacoco.org/jacoco/){: .tech} и JavaDoc и коммитит всё в ветку `gh-pages` | [GitHub Pages](https://pages.github.com/){: .tech} |

[Maven](https://maven.apache.org/){: .cmd} запускает всё одним `mvn verify`: [демо-тесты — отдельным запуском](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/pom.xml#L99), потом, после отчёта о покрытии, [генератор страниц](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/pom.xml#L168). Формат JUnit [Open Test Reporting](https://github.com/ota4j-team/open-test-reporting){: .tech} хранит результаты и картинки; его собственный просмотрщик никуда не делся, но смотреть вам захочется на нашу страницу.

## 5. Демо-тесты: для тех, кому лень двигать ручки

Демо-тест — это тест, на результат которого смотрят глазами. Каждый берёт набор параметров и баланс, сверяет статус и сумму с [правилами, записанными ещё раз](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/test/java/org/krmdemo/plansinstr/equilib/DemoCases.java#L181) независимо от библиотеки, и публикует картинку при этом балансе в трёх размерах рядом. [Страница демо-тестов](https://krm-demo.github.io/ai-plans-instr/plans-math/demo-tests.html) превращается в каталог: поменяли цвет или шрифт, запушили, прокрутили — и изменение видно сразу во всех случаях.

Какие случаи брать? Не все: балансов бесконечно много. Их выбирают четыре простых правила ([код](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/test/java/org/krmdemo/plansinstr/equilib/DemoCases.java#L63)):

- **Виды параметров**: пороги врозь или одна цель; номинал нулевой или нет; $A$ нулевой, равный $\tau_{\min}$ или больше; $L$ равный $\tau_{\max}$, больше или в миллионах.
- **Пары, а не все сочетания**: каждая пара видов встречается хотя бы в одном наборе — 19 наборов вместо 60, в шести группах.
- **Внутри и на краю**: один баланс внутри каждого статуса и один ровно на каждой границе.
- **Ничего дважды**: баланс остаётся, только если его картинка показывает что-то новое; Swept **Out** при 75 тысячах не показывает ничего, чего не показали 80 тысяч ([код](https://github.com/krm-demo/ai-plans-instr/blob/ea9294d796d5cb4da98aec2283a9fd4f5fece81b/plans-math/src/test/java/org/krmdemo/plansinstr/equilib/DemoCases.java#L96)).

Каждое имя написано так же, как на графике: `threshold: −$8k [$40k ; $60k] +$10k · A $25k · L $30k`, потом `x = $32k = Tₘᵢₙ − τₘᵢₙ → Swept In Full $8k`, по возрастанию баланса.

## 6. Что здесь наше

Честно говоря, каждая деталь по отдельности давно известна: медиа-запросы внутри SVG, интерактивность на чистом CSS, шаблоны Thymeleaf, картинки как результат тестов, каталоги всех состояний компонента. А вот вместе мы такого не встречали: один SVG как целое семейство картинок, от иконки до ноутбука, с геометрией, посчитанной в Java, и разметкой в шаблоне; проба, которая ходит за мышью из заранее посчитанных кадров, — и всё ещё без JavaScript; и тесты, которые сами себя фотографируют, подобраны так, чтобы каждая картинка показывала новое, названы в обозначениях графика и собраны в одну страницу, которую просто листаешь. Вот этим мы и гордимся.

## 7. Почему «krm-demo»

Потому что первые три согласные фамилии автора — К, Р и М, а всё здесь — демо: идеи, обкатанные в открытую, без привязки к какой-либо настоящей системе, прежде чем пойти работать куда-то ещё. А романсы — это уж балансы сами.

## Литература

- [Демо-страница](https://krm-demo.github.io/ai-plans-instr/plans-math/) и [демо-тесты](https://krm-demo.github.io/ai-plans-instr/plans-math/demo-tests.html)
- [Код](https://github.com/krm-demo/ai-plans-instr/tree/main/plans-math) и его [README](https://github.com/krm-demo/ai-plans-instr/blob/main/plans-math/README.md): сборка и как устроен шаблон Thymeleaf
- [JavaDoc](https://krm-demo.github.io/ai-plans-instr/plans-math/apidocs/index.html), [технические тесты](https://krm-demo.github.io/ai-plans-instr/plans-math/tests/tech/index.html) и [покрытие](https://krm-demo.github.io/ai-plans-instr/plans-math/jacoco/index.html)
