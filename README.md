# TodoMVC: $mol vs Lit vs Symbiote.js

Архитектурное сравнение трёх подходов к построению UI на примере TodoMVC.

**Контекст**: дебаты на Хабре (nin-jin vs i360u vs replicate_1) выявили путаницу между проблемами Web Components, которые "уже пофикшены стандартами", и проблемами, которые архитектурно неисправимы. Этот документ разделяет два класса проблем на конкретном примере.

## Реализации

|              | hyoo_todomvc ($mol)    | Lit (Speedometer 3.0)        | Symbiote.js                     |
| ------------ | ---------------------- | ---------------------------- | ------------------------------- |
| **Путь**     | `hyoo/todomvc/`        | `bog/todomvc-compare/lit/`   | `bog/todomvc-compare/symbiote/` |
| **Источник** | Оригинал               | WebKit/Speedometer 3.0 `lit` | Написан с нуля                  |
| **Язык**     | TypeScript + view.tree | TypeScript                   | JavaScript                      |

---

## Метрики

### Размер кода

| Метрика              | $mol                                          | Lit                        | Symbiote                  |
| -------------------- | --------------------------------------------- | -------------------------- | ------------------------- |
| **LOC логика + CSS** | 357 (134 .view.ts + 60 .view.tree + 163 .css) | 832 (502 логика + 330 CSS) | 566 (логика + CSS вместе) |
| **LOC тесты**        | 140                                           | —                          | —                         |
| **LOC итого**        | 357 ( с тестами 497 )                         | 832                        | 566                       |
| **Файлов (src)**     | 4 + css                                       | 10                         | 4                         |

### Размер бандла

| Метрика            | $mol    | Lit   | Symbiote |
| ------------------ | ------- | ----- | -------- |
| **Bundle raw**     | 185 KB  | 36 KB | 27 KB    |
| **Bundle gzip**    | 33 KB   | 12 KB | 9 KB     |
| **Bundle brotli**  | 27 KB   | 11 KB | 8 KB     |
| **Фреймворк gzip** | ~29 KB  | ~8 KB | ~6 KB    |
| **App-код gzip**   | ~4 KB   | ~4 KB | ~3 KB    |

> **Примечание о бандле $mol**: MAM делает tree-shaking — в бандл попадают только используемые модули. Большой размер обусловлен тем, что TodoMVC использует экосистему компонент (с виртуализацией, роутером, локализацией и т.д.), которые тянут свои зависимости. Это не «лишний код» — это функциональность, которой у Lit и Symbiote просто нет. На бОльшем приложении, эта разница нивелируется, так как этот "лишний" код везде переиспользуется.

### Возможности

| Фича              | $mol                               | Lit       | Symbiote        |
| ----------------- | ---------------------------------- | --------- | --------------- |
| **Shadow DOM**    | Нет                                | Да        | Нет (Light DOM) |
| **TypeScript**    | Да                                 | Да        | Нет             |
| **Тесты без DOM** | Да (140 строк)                     | Нет       | Нет             |
| **Виртуализация** | Из коробки (все компоненты вообще) | Нет       | Нет             |
| **localStorage**  | Да ($mol_state_local)              | Нет       | Да              |
| **Роутинг**       | Да ($mol_state_arg)                | Да (hash) | Да (hash)       |

---

## Архитектурный анализ: неисправимые проблемы Web Components

Каждая проблема проиллюстрирована конкретным кодом из трёх TodoMVC.

### A. Память: 124 байта vs 16 байт на компонент

**Суть**: Custom Element = HTMLElement = host object в C++ heap браузера. $mol_view = JS object в V8 heap, DOM создаётся лениво.

```ts
// Lit: каждый todo-item — это HTMLElement (C++ heap, ~124 байт minimum)
@customElement("todo-item")
export class TodoItem extends LitElement { ... }
// <todo-item> сразу аллоцирует DOM-ноду при createElement

// Symbiote: аналогично, каждый <todo-item> = HTMLElement
class TodoItem extends Symbiote { ... }
TodoItem.reg('todo-item');

// $mol: компонент — JS-объект. DOM создаётся ТОЛЬКО при рендере.
// 1000 задач в модели ≠ 1000 DOM-элементов
// $mol_list рендерит только видимые (виртуализация)
task_rows() {
    return this.task_ids_filtered().map(id => this.Task_row(id))
}
```

**Статус**: НЕИСПРАВИМО. Custom Elements по спецификации extends HTMLElement. Невозможно создать CE без DOM-ноды. Виртуализацию нужно реализовывать отдельно поверх.

### B. JIT-потолок: host objects не оптимизируются

**Суть**: `element.textContent = x` — вызов через C++ binding, не инлайнится JIT. `obj.title = x` — прямая запись в память, V8 оптимизирует.

```ts
// Lit: обновление через DOM property
// element.textContent = newValue  ← C++ binding, slow path
render() {
    return html`<label> ${this.text} </label>`;
    // Lit под капотом делает: node.textContent = value
}

// $mol: обновление через JS property
// this.title() — чтение из memo-кеша (JS heap)
// DOM обновляется батчем через requestAnimationFrame
task_title(id, next?) {
    return this.task(id, ...)!.title ?? ''
}
```

**Статус**: НЕИСПРАВИМО. DOM objects живут в C++ heap браузера. Каждый доступ к свойству — вызов через binding.

### C. Push vs Pull реактивность

**Суть**: WC используют push-модель (атрибут изменился → callback вызван). $mol использует pull-модель (значение запрошено → граф зависимостей определяет, что пересчитать).

```ts
// Lit: Push через EventTarget + requestUpdate
export class Todos extends EventTarget {
    #notifyChange() {
        this.dispatchEvent(new Event("change")); // push!
    }
    add(text) {
        this.#todos.push({ ... });
        this.#notifyChange(); // ← ручной push
    }
}
// Каждый компонент подписывается через @updateOnEvent("change")
// При ЛЮБОМ изменении ВСЕ подписчики получают уведомление

// Symbiote: Push через EventTarget аналогично
store.addEventListener('change', () => this.#render());

// $mol: Pull — автоматический граф зависимостей
@$mol_mem
groups_completed() {
    // Автоматически отслеживает зависимости:
    // task_ids() → task() → groups
    // Пересчитывается ТОЛЬКО когда изменились зависимости
    for (let id of this.task_ids()) {
        var task = this.task(id)!;
        groups[String(task.completed)].push(id);
    }
    return groups;
}
// Не нужен ни EventTarget, ни ручные подписки
```

**Статус**: НЕИСПРАВИМО. CE спека не предусматривает pull-реактивность. Lit и Symbiote наворачивают свою поверх, но это не часть платформы — это их собственный рантайм.

### D. Поздний жизненный цикл

**Суть**: CE: constructor → вставка в DOM → connectedCallback → данные. $mol: данные → view.tree → DOM (только когда нужно).

```ts
// Lit: данные приходят ПОСЛЕ constructor
@customElement("todo-app")
export class TodoApp extends LitElement {
    constructor() {
        super(); // DOM-нода уже создана, но данных ещё нет
        this.addEventListener(AddTodoEvent.eventName, this.#onAddTodo);
    }
    connectedCallback() {
        super.connectedCallback();
        this.todoList.connect(); // подписка на hashchange — только после вставки в DOM
    }
}

// Symbiote: initCallback только после вставки в DOM
initCallback() {
    super.initCallback();
    this.#render();
    store.addEventListener('change', () => this.#render());
}

// $mol: данные определяют всё. DOM — побочный эффект.
// view.tree декларативно описывает, ЧТО показать.
// Компонент может работать БЕЗ DOM (тесты).
$hyoo_todomvc $mol_scroll
    sub /
        <= Page $mol_list rows / ...
```

**Статус**: НЕИСПРАВИМО. Порядок constructor → connected зафиксирован в спеке. Компонент не может получить данные до создания DOM-ноды.

### E. Shadow DOM vs глобальные стили

**Суть**: Shadow DOM создаёт барьер для CSS. `::part()` и CSS custom properties — единственные мосты.

```ts
// Lit: каждый компонент несёт свои стили в Shadow DOM
@customElement("todo-item")
export class TodoItem extends LitElement {
    static styles = [todoStyles, css`
        // 80+ строк CSS, дублирующих базовые стили
        .toggle { ... }
        .destroy { ... }
        label { ... }
    `];
    // Глобальная тема? ::part()? CSS variables? Удачи.
}

// Symbiote: Light DOM, глобальные стили через rootStyles
TodoItem.rootStyles = css`
    todo-item .toggle { ... }
`;
// Работает, но rootStyles — это инъекция в <style> глобально

// $mol: attribute selectors, стили по атрибутам на обычном DOM
[hyoo_todomvc_task_row] { display: flex; }
[hyoo_todomvc_task_row_completed] [hyoo_todomvc_task_row_title] {
    color: #d9d9d9;
    text-decoration: line-through;
}
// Нет барьеров, нет Shadow DOM, полная каскадность
```

**Статус**: ЧАСТИЧНО ИСПРАВИМО. Symbiote уже отказался от Shadow DOM. Но Lit (и стандарт WC) продвигают Shadow DOM как default. Отказ от Shadow DOM = отказ от ключевой фичи WC.

### F. Компиляция шаблонов

**Суть**: Lit парсит `html\`...\`` в runtime (кешируется после первого вызова). $mol компилирует view.tree в build time.

```ts
// Lit: runtime parsing (хоть и с кешированием)
render() {
    return html`
        <li class="${classMap(itemClassList)}">
            <div class="view">
                <input class="toggle" type="checkbox" .checked=${this.completed} />
                <label @dblclick=${this.#beginEdit}> ${this.text} </label>
                <button @click=${this.#deleteTodo} class="destroy"></button>
            </div>
        </li>
    `;
    // Первый вызов: парсинг template literal → Parts
    // Последующие: обновление только Parts (быстро, но парсинг уже произошёл)
}

// Symbiote: аналогичный runtime parsing шаблона
TodoItem.template = html`
    <div class="view">
        <input class="toggle" type="checkbox" bind="checked: completed">
        <label bind="textContent: text"></label>
`;

// $mol: view.tree → TypeScript на этапе билда. 0 runtime parsing.
// $hyoo_todomvc_task_row $mol_view
//     sub /
//         <= Complete $mol_check
//             checked? <=> completed? false
// ↓ компилируется в ↓
// Task_row(id) { return new $hyoo_todomvc_task_row() }
```

**Статус**: ЧАСТИЧНО ИСПРАВИМО. Есть Template Instantiation proposal, но он застрял. На практике все WC фреймворки парсят шаблоны в runtime.

### G. Тестируемость без DOM

**Суть**: $mol компоненты тестируются как обычные JS-объекты. WC компоненты = DOM-элементы, нужна DOM-среда.

```ts
// $mol: тесты БЕЗ DOM. Компонент — просто объект.
'task add'($) {
    const app = $hyoo_todomvc.make({ $ })
    app.Add().value('test')
    app.Add().submit()
    $mol_assert_equal(app.task_rows().at(-1)!.title(), 'test')
}
// Никакого document.createElement, никакого connectedCallback
// Просто вызовы методов и проверка состояния

// Lit: для тестирования нужен DOM
// const el = document.createElement('todo-app');
// document.body.appendChild(el); // connectedCallback!
// await el.updateComplete; // ждём рендер!
// el.shadowRoot.querySelector('.new-todo')... // доступ через Shadow DOM!

// В hyoo_todomvc есть 140 строк тестов.
// В Lit и Symbiote реализациях — 0.
```

**Статус**: НЕИСПРАВИМО. CE extends HTMLElement. Компонент невозможно инстанцировать без DOM-ноды.

### H. Композиция и наследование шаблонов

**Суть**: $mol view.tree поддерживает наследование — шаблон базового класса наследуется и переопределяется. В WC template и Shadow DOM — closed scope, нет механизма template inheritance.

```ts
// $mol: наследование шаблонов через view.tree
// $hyoo_todomvc extends $mol_scroll → наследует sub, head, foot
// Можно переопределить отдельные части:
$hyoo_todomvc $mol_scroll
    sub / <= Page $mol_list ...
// Page наследует поведение $mol_list (виртуализация, ленивый рендер)

// Lit: class inheritance работает, но Shadow DOM — нет
@customElement("todo-app")
export class TodoApp extends LitElement {
    // render() ПОЛНОСТЬЮ переписывается
    // Нет способа "унаследовать шаблон родителя и заменить slot"
    // Каждый компонент пишет свой template с нуля
}

// Symbiote: аналогично — template объявляется целиком
TodoApp.template = html`<section class="todoapp">...`;
// Наследования шаблонов нет
```

**Статус**: НЕИСПРАВИМО. Shadow DOM — closed scope. Нет спецификации для template inheritance.

---

## Итого

| Проблема                          | Статус      | Затрагивает            |
| --------------------------------- | ----------- | ---------------------- |
| A. Память (124 vs 16 байт)        | НЕИСПРАВИМО | Lit, Symbiote          |
| B. JIT-потолок (host objects)     | НЕИСПРАВИМО | Lit, Symbiote          |
| C. Push vs Pull реактивность      | НЕИСПРАВИМО | Lit, Symbiote          |
| D. Поздний жизненный цикл         | НЕИСПРАВИМО | Lit, Symbiote          |
| E. Shadow DOM vs глобальные стили | Частично    | Lit (Symbiote обходит) |
| F. Компиляция шаблонов            | Частично    | Lit, Symbiote          |
| G. Тестируемость без DOM          | НЕИСПРАВИМО | Lit, Symbiote          |
| H. Наследование шаблонов          | НЕИСПРАВИМО | Lit, Symbiote          |

**6 из 8 проблем — архитектурно неисправимы.** Они вытекают из фундаментального решения: CE extends HTMLElement. Пока компонент = DOM-нода, эти ограничения останутся.

Symbiote.js — интересная попытка обойти часть проблем (Light DOM, простой API), но фундаментальные ограничения CE (память, JIT, жизненный цикл, тестируемость) остаются.

---

## Как собрать и проверить

```bash

git clone https://github.com/b-on-g/todomvc-compare 

# Lit
cd todomvc-compare/lit
npm install && npm run build
open index.html

# Symbiote
cd todomvc-compare/symbiote
npm install && npm run build
open index.html  # нужен HTTP-сервер для ES modules

# hyoo_todomvc
cp ...
open http://localhost:9080/hyoo/todomvc/-/test.html
```
