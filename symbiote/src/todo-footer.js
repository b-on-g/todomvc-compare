import Symbiote, { html, css } from '@symbiotejs/symbiote';
import { store } from './store.js';

export class TodoFooter extends Symbiote {

    renderShadow = false;

    init$ = {
        activeCount: 0,
        hasCompleted: false,
        filterAll: '',
        filterActive: '',
        filterCompleted: '',

        onClearCompleted: () => {
            store.clearCompleted();
        },
    };

    initCallback() {
        super.initCallback();
        this.#update();
        store.addEventListener('change', () => this.#update());
    }

    #update() {
        const filter = store.filter;
        this.$.activeCount = store.active.length;
        this.$.hasCompleted = store.completed.length > 0;
        this.$.filterAll = filter === 'all' ? 'selected' : '';
        this.$.filterActive = filter === 'active' ? 'selected' : '';
        this.$.filterCompleted = filter === 'completed' ? 'selected' : '';
        this.hidden = store.all.length === 0;

        // Toggle clear button visibility
        const clearBtn = this.querySelector('.clear-completed');
        if (clearBtn) clearBtn.hidden = !this.$.hasCompleted;
    }
}

TodoFooter.template = html`
    <span class="todo-count">
        <strong bind="textContent: activeCount"></strong> items left
    </span>
    <ul class="filters">
        <li><a href="#/" bind="className: filterAll">All</a></li>
        <li><a href="#/active" bind="className: filterActive">Active</a></li>
        <li><a href="#/completed" bind="className: filterCompleted">Completed</a></li>
    </ul>
    <button class="clear-completed" bind="onclick: onClearCompleted">Clear completed</button>
`;

TodoFooter.rootStyles = css`
    todo-footer[hidden] {
        display: none;
    }
    todo-footer {
        display: block;
        padding: 10px 15px;
        height: 20px;
        text-align: center;
        font-size: 15px;
        border-top: 1px solid #e6e6e6;
        position: relative;
    }
    todo-footer:before {
        content: "";
        position: absolute;
        right: 0;
        bottom: 0;
        left: 0;
        height: 50px;
        overflow: hidden;
        box-shadow: 0 1px 1px rgba(0, 0, 0, 0.2), 0 8px 0 -3px #f6f6f6,
            0 9px 1px -3px rgba(0, 0, 0, 0.2), 0 16px 0 -6px #f6f6f6,
            0 17px 2px -6px rgba(0, 0, 0, 0.2);
    }
    todo-footer .todo-count {
        float: left;
        text-align: left;
    }
    todo-footer .todo-count strong {
        font-weight: 300;
    }
    todo-footer .filters {
        margin: 0;
        padding: 0;
        list-style: none;
        position: absolute;
        right: 0;
        left: 0;
    }
    todo-footer .filters li {
        display: inline;
    }
    todo-footer .filters li a {
        color: inherit;
        margin: 3px;
        padding: 3px 7px;
        text-decoration: none;
        border: 1px solid transparent;
        border-radius: 3px;
    }
    todo-footer .filters li a:hover {
        border-color: #db7676;
    }
    todo-footer .filters li a.selected {
        border-color: #ce4646;
    }
    todo-footer .clear-completed {
        float: right;
        position: relative;
        line-height: 19px;
        text-decoration: none;
        cursor: pointer;
        border: 0;
        background: none;
        font-size: inherit;
        font-family: inherit;
        color: inherit;
        padding: 0;
        appearance: none;
    }
    todo-footer .clear-completed:hover {
        text-decoration: underline;
    }
`;

TodoFooter.reg('todo-footer');
