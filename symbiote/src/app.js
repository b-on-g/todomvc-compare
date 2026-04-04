import Symbiote, { html, css } from '@symbiotejs/symbiote';
import { store } from './store.js';
import './todo-item.js';
import './todo-footer.js';

class TodoApp extends Symbiote {

    renderShadow = false;

    init$ = {
        onNewTodoKeydown: (e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
                store.add(e.target.value.trim());
                e.target.value = '';
            }
        },

        onToggleAll: (e) => {
            store.toggleAll();
        },
    };

    initCallback() {
        super.initCallback();
        this.#renderList();
        store.addEventListener('change', () => this.#renderList());
    }

    #renderList() {
        const filtered = store.filtered();
        const hasItems = store.all.length > 0;
        const allCompleted = store.allCompleted;

        // Toggle main section visibility
        const mainSection = this.ref.mainSection;
        if (mainSection) mainSection.hidden = !hasItems;

        // Update toggle-all checkbox
        const toggleAll = this.ref.toggleAll;
        if (toggleAll) toggleAll.checked = allCompleted;

        // Reconcile list
        const list = this.ref.todoList;
        if (!list) return;

        const existingItems = [...list.querySelectorAll('todo-item')];
        const existingMap = new Map();
        for (const el of existingItems) {
            if (el.$ && el.$.todoId !== undefined) {
                existingMap.set(el.$.todoId, el);
            }
        }

        const fragment = document.createDocumentFragment();
        for (const todo of filtered) {
            let el = existingMap.get(todo.id);
            if (el) {
                el.$.text = todo.text;
                el.$.completed = todo.completed;
                existingMap.delete(todo.id);
            } else {
                el = document.createElement('todo-item');
                // Set state after element is created
                requestAnimationFrame(() => {
                    if (el.$) {
                        el.$.todoId = todo.id;
                        el.$.text = todo.text;
                        el.$.completed = todo.completed;
                    }
                });
            }
            fragment.appendChild(el);
        }

        // Remove items no longer displayed
        for (const [, el] of existingMap) {
            el.remove();
        }

        list.textContent = '';
        list.appendChild(fragment);
    }
}

TodoApp.template = html`
    <section class="todoapp">
        <header class="header">
            <h1>todos</h1>
            <input class="new-todo" placeholder="What needs to be done?" autofocus bind="onkeydown: onNewTodoKeydown">
        </header>
        <section ref="mainSection" class="main" hidden>
            <input ref="toggleAll" id="toggle-all" class="toggle-all" type="checkbox" bind="onchange: onToggleAll">
            <label for="toggle-all">Mark all as complete</label>
            <ul ref="todoList" class="todo-list"></ul>
        </section>
        <todo-footer></todo-footer>
    </section>
`;

TodoApp.rootStyles = css`
    todo-app {
        display: block;
        background: #fff;
        margin: 130px 0 40px 0;
        position: relative;
        box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2), 0 25px 50px 0 rgba(0, 0, 0, 0.1);
    }
    todo-app h1 {
        position: absolute;
        top: -140px;
        width: 100%;
        font-size: 80px;
        font-weight: 200;
        text-align: center;
        color: #b83f45;
        text-rendering: optimizeLegibility;
    }
    todo-app .main {
        position: relative;
        z-index: 2;
        border-top: 1px solid #e6e6e6;
    }
    todo-app .new-todo {
        position: relative;
        margin: 0;
        width: 100%;
        font-size: 24px;
        font-family: inherit;
        font-weight: inherit;
        line-height: 1.4em;
        border: 0;
        color: inherit;
        padding: 16px 16px 16px 60px;
        background: rgba(0, 0, 0, 0.003);
        box-shadow: inset 0 -2px 1px rgba(0, 0, 0, 0.03);
        box-sizing: border-box;
    }
    todo-app .new-todo::placeholder {
        font-style: italic;
        font-weight: 400;
        color: rgba(0, 0, 0, 0.4);
    }
    todo-app .toggle-all {
        width: 1px;
        height: 1px;
        border: none;
        opacity: 0;
        position: absolute;
        right: 100%;
        bottom: 100%;
    }
    todo-app .toggle-all + label {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 45px;
        height: 65px;
        font-size: 0;
        position: absolute;
        top: -65px;
        left: 0;
    }
    todo-app .toggle-all + label:before {
        content: "\\276F";
        display: inline-block;
        font-size: 22px;
        color: #949494;
        padding: 10px 27px;
        transform: rotate(90deg);
    }
    todo-app .toggle-all:checked + label:before {
        color: #484848;
    }
    todo-app .todo-list {
        margin: 0;
        padding: 0;
        list-style: none;
    }
`;

TodoApp.reg('todo-app');
