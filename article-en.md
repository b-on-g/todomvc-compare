# What's Actually Wrong with Web Components

Ladies and gentlemen, we [continue digging](https://habr.com/ru/articles/1019206/) into the intricacies of web components. I made a [bench here — comparing frameworks](https://github.com/b-on-g/todomvc-compare) ($mol/Lit/Symbiote) on TodoMVC. Seems like we're talking about one thing, but the bench is about something else, right? Nope — to understand web components you need frameworks that put them front and center, the ones that "bet on them."

Here's what I managed to figure out:

**First. Memory:** 124 bytes per web component, and 16 bytes per JS object. An order of magnitude difference — that's a lot, and without virtualization the interface will most likely lag.

```javascript
// Lit: each todo-item is an HTMLElement (C++ heap, ~124 bytes minimum)
@customElement("todo-item")
export class TodoItem extends LitElement { ... }
// <todo-item> immediately allocates a DOM node on createElement

// Symbiote: same deal, each <todo-item> = HTMLElement
class TodoItem extends Symbiote { ... }
TodoItem.reg('todo-item');

// $mol: component is a JS object. DOM is created ONLY on render.
// 1000 tasks in the model ≠ 1000 DOM elements
// $mol renders only visible components (virtualization)
task_rows() {
    return this.task_ids_filtered().map(id => this.Task_row(id))
}
```

| Custom Element                      | js/mol_view        |
| ----------------------------------- | ------------------ |
| 1,000 tasks: ~124 KB just for nodes | ~16 KB for objects |
| 10,000 tasks: ~1.2 MB               | ~160 KB            |

And that's just the base nodes — without text nodes, attributes, styles, and event listeners, which also get allocated in the C++ heap. The Custom Elements spec requires `class MyEl extends HTMLElement`. You can't create a CE without a DOM node.

This same argument is explored [here](https://nolanlawson.com/2024/09/28/web-components-are-okay/) by the author of SolidJS. Below is the response from the article's author:

> "If your goal is to build the absolute fastest framework you can, then you want to minimize DOM nodes wherever possible. This means that web components are off the table."

Put simply — want performance? Don't use web components.

**Second**, besides increased memory consumption, we lose JIT optimization.

| Operation                        | Time       | How much worse |
| -------------------------------- | ---------- | -------------- |
| obj.title = x (JS object)        | ~1–2 ns    | baseline — 1x  |
| element.textContent = x (DOM)    | ~30–60 ns  | 30x worse      |
| element.setAttribute('class', x) | ~50–100 ns | 50x            |
| element.style.color = x          | ~80–150 ns | 80x            |

Task: select all (relevant for email, for example, which just can't delete all messages at once if they don't fit on one page). Here's how it degrades:

| Tasks   | Lit                                             | $mol  | Difference |
| ------- | ----------------------------------------------- | ----- | ---------- |
| 100     | 60 µs (microseconds)                            | 3 µs  | 20x        |
| 1,000   | 600 µs                                          | 8 µs  | 75x        |
| 10,000  | 8 ms                                            | 12 µs | 650x       |
| 100,000 | 120 ms (lag — if a frame takes more than 16 ms) | 15 µs | 8,000x     |

And a question for readers. Should we even orient ourselves around [js-framework-benchmark](https://github.com/krausest/js-framework-benchmark) in this case? I think not. You shouldn't render what isn't visible. They're fighting over pennies there, and everyone knows you don't penny-pinch. And let's recall the perf quote above.

And a code example. Here we're also parsing HTML... (that's bad)

```javascript
// Lit: update through DOM property
// element.textContent = newValue  ← C++ binding, slow path
render() {
    return html`<label> ${this.text} </label>`;
    // Under the hood, Lit does: node.textContent = value
}

// $mol: update through JS property
// this.title() — reads from memo cache (JS heap)
// DOM updates in a batch via requestAnimationFrame
task_title(id, next?) {
    return this.task(id, ...)!.title ?? ''
}
```

Moving on. WC (Web Components) use push semantics for reactivity. Pull — I doubt they'll ever support it. What does this affect? The number of lines of code **written by you**. And all people make mistakes — there's a saying for a reason: "The best code is code that was never written." Let's look at the [bench](https://github.com/b-on-g/todomvc-compare).

![Benchmark comparison](https://habrastorage.org/r/w1560/getpro/habr/upload_files/d2a/7cf/fd2/d2a7cffd29174443b049d6c41898efae.png)
_Respectable._

And a code example, for clarity.

```javascript
// Lit: Push via EventTarget + requestUpdate
export class Todos extends EventTarget {
    #notifyChange() {
        this.dispatchEvent(new Event("change")); // push!
    }
    add(text) {
        this.#todos.push({ ... });
        this.#notifyChange(); // ← manual push
    }
}
// Each component subscribes via @updateOnEvent("change")
// On ANY change ALL subscribers get notified

// Symbiote: Push via EventTarget similarly
store.addEventListener('change', () => this.#render());

// $mol: Pull — automatic dependency graph
@$mol_mem
groups_completed() {
    // Automatically tracks dependencies:
    // task_ids() → task() → groups
    // Recalculates ONLY when dependencies change
    for (let id of this.task_ids()) {
        var task = this.task(id)!;
        groups[String(task.completed)].push(id);
    }
    return groups;
}
// No EventTarget needed, no manual subscriptions
```

Not for nothing did Vue.js choose pull reactivity.

Let's touch on testability. To test a web component — you need to render it. Maximally inefficient. I think we all hate it when tests take forever.

Let's look at an example:

```javascript
// $mol: tests WITHOUT DOM. Component is just an object.
'task add'($) {
    const app = $hyoo_todomvc.make({ $ })
    app.Add().value('test')
    app.Add().submit()
    $mol_assert_equal(app.task_rows().at(-1)!.title(), 'test')
}
// No document.createElement, no connectedCallback
// Just method calls and state checks

// Lit: testing requires DOM
const el = document.createElement('todo-app');
document.body.appendChild(el); // connectedCallback!
await el.updateComplete; // wait for render!
el.shadowRoot.querySelector('.new-todo')... // access through Shadow DOM!

// hyoo_todomvc has 140 lines of tests.
// Lit and Symbiote implementations — 0. (and they have even more code)
```

About inheritance.

How it works in Lit with those "convenient little web components":

```javascript
class TodoApp extends LitElement {
	render() {
		// The entire template — a monolithic block. 40+ lines of HTML.
		return html`
			<header>...</header>
			<section>
				<ul>
					${this.todos.map(t => html`...`)}
				</ul>
			</section>
			<footer>
				<span>...</span>
				<ul>
					...
				</ul>
				<button>...</button>
			</footer>
		`
	}
}

// Want to change just the footer?
class MyTodoApp extends TodoApp {
	render() {
		// Can't say "take parent's render(), replace footer."
		// The only option — copy ALL 40 lines
		// and change the piece you need.
		return html`
			<header>...</header>
			// copy
			<section>...</section>
			// copy
			<footer>MY FOOTER</footer>
			// all for this
		`
	}
}
```

How it works in $mol:

```javascript
// Base component: scrollable area
$mol_scroll
    sub /           ← content
    scroll_top 0    ← scroll position
    event_scroll     ← handler

// TodoMVC INHERITS $mol_scroll and replaces only sub (child elements):
$hyoo_todomvc $mol_scroll
    sub /
        <= Page $mol_list ...

// Scroll, position, handler — all inherited for free.
// We only overrode the CONTENT.

// You can go deeper — inherit $hyoo_todomvc itself and replace, say, just the footer:
$my_custom_todo $hyoo_todomvc
    foot <= My_footer $mol_view
// Everything else (list, input, filters) — inherited as is.
```

Same goes for inheriting logic and styles (uniquely cascading). Zero copy-paste and boilerplate.

And to wrap up, I'd like to argue with one statement. Below is my loose quote from [@i360u](https://habr.com/ru/users/i360u/)'s text ([first link](https://habr.com/ru/articles/1019206/) in the article):

> "Any engineering decision is a compromise. The existence of 'cons' doesn't outweigh all possible 'pros' by default."

To some extent you can agree with that. If not for one "BUT." We all have the same task — build the most convenient, fast, beautiful application, without legacy, with clean code that's easy to maintain, and all that jazz. Once more — the task is the same for everyone. And you need to look at who solves it best **across the entirety** of the frontend world. I know one such solution.

It's $mol — everything else is worse. That's a fact.

The whole "vendor lock-in," "scary and confusing to learn something new" — those are childish excuses to avoid facing facts. Everywhere in programming you have to learn new things. And there's no vendor lock at all. Think about it. Kirill. Subscribe.

---

## FAQ (from the comments)

**"But if you use virtualization, you won't render those CE nodes either — same thing, no?"**

Not quite. With virtualization the complexity shifts to the container above. And it's [not that straightforward](https://github.com/nickmessing/todomvc-compare) in practice — $mol has built-in virtualization by default, while in WC-based frameworks you have to architect it yourself. Every extra architectural decision you have to make is another chance to mess up.

**"For composition — just split render into renderHeader / renderBody / renderFooter and override one in the subclass. This pattern is 40 years old."**

Absolutely agree. The point here is more that $mol enforces this as an **architectural constraint** — the developer physically can't produce that monolithic-template anti-pattern I showed. The fewer mistakes a programmer can make, and the more the compiler can catch — the better. Again, it's about not having to think about or write "extra" code.

**"You're generalizing too radically. The problem isn't web components themselves — it's how people use them. Naively rendering thousands of elements through DOM will hit limits regardless of approach."**

I think so too. But many people actually look at [js-framework-benchmark](https://github.com/krausest/js-framework-benchmark) and believe it reflects real-world performance. That causes frustration — it feels like the benchmark is misleading. If the benchmark is bad, why does it exist? I think we should use every trick available and show the real maximum performance of JS. It's not infinite either, but how far can it go? Nobody knows — everyone's stuck on HTML. By my estimates, you could write an entire OS on $mol, and it would be faster and more stable than many existing ones. (And notifications would arrive instantly with the bell icon updating too.)

**"What about Ctrl+F page search? You can't find what's not rendered."**

Fair point. But funnily enough, in $mol search actually works — it overrides the standard browser search by default and searches through the full data, not just the visible DOM.

**"Isn't $mol just for SPAs? For sites with interactive elements — take SSG + web components."**

A matter of priorities. For SSG I'd still pick $mol — theming, localization, and responsive layout come out of the box. As for WC — if you need to shove a component into an existing project, sure, why not. I'd even try plugging one into my own $mol app.

**"Where are the hidden benchmark results that were bad for $mol?"**

The initial benchmark was set up incorrectly — there were junk files in the root that got pulled into all bundles locally. The real size turned out to be ~185 KB. Honestly noted it in the [bench](https://github.com/b-on-g/todomvc-compare). You can verify by building it yourself. I'd welcome a real comparison from an independent author — that's how truth is born, the scientific way.
