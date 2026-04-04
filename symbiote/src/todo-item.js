import Symbiote, { html, css } from '@symbiotejs/symbiote';
import { store } from './store.js';

export class TodoItem extends Symbiote {

    renderShadow = false;

    init$ = {
        todoId: 0,
        text: '',
        completed: false,
        editing: false,

        onToggle: () => {
            store.toggle(this.$.todoId);
        },
        onDestroy: () => {
            store.remove(this.$.todoId);
        },
        onDblClick: () => {
            this.$.editing = true;
        },
        onEditKeydown: (e) => {
            if (e.key === 'Enter') {
                this.#commitEdit(e.target);
            } else if (e.key === 'Escape') {
                this.$.editing = false;
            }
        },
        onEditBlur: (e) => {
            if (this.$.editing) {
                this.#commitEdit(e.target);
            }
        },
    };

    initCallback() {
        super.initCallback();

        this.sub('completed', (val) => {
            this.classList.toggle('completed', !!val);
        });

        this.sub('editing', (val) => {
            this.classList.toggle('editing', !!val);
            if (val) {
                requestAnimationFrame(() => {
                    const input = this.ref.editInput;
                    if (input) {
                        input.value = this.$.text;
                        input.focus();
                    }
                });
            }
        });
    }

    #commitEdit(input) {
        const text = input.value.trim();
        if (text) {
            store.edit(this.$.todoId, text);
        } else {
            store.remove(this.$.todoId);
        }
        this.$.editing = false;
    }
}

TodoItem.template = html`
    <div class="view">
        <input class="toggle" type="checkbox" bind="checked: completed; onchange: onToggle">
        <label bind="textContent: text; ondblclick: onDblClick"></label>
        <button class="destroy" bind="onclick: onDestroy"></button>
    </div>
    <input ref="editInput" class="edit" bind="onkeydown: onEditKeydown; onblur: onEditBlur">
`;

TodoItem.rootStyles = css`
    todo-item {
        display: block;
        position: relative;
        font-size: 24px;
        border-bottom: 1px solid #ededed;
    }
    todo-item:last-child {
        border-bottom: none;
    }
    todo-item.editing .view {
        display: none;
    }
    todo-item.editing .edit {
        display: block;
        width: calc(100% - 43px);
        padding: 12px 16px;
        margin: 0 0 0 43px;
    }
    todo-item .toggle {
        text-align: center;
        width: 40px;
        height: auto;
        position: absolute;
        top: 0;
        bottom: 0;
        margin: auto 0;
        border: none;
        appearance: none;
        opacity: 0;
    }
    todo-item .toggle + label {
        background-image: url("data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%22-10%20-18%20100%20135%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2250%22%20fill%3D%22none%22%20stroke%3D%22%23949494%22%20stroke-width%3D%223%22/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: center left;
        word-break: break-all;
        padding: 15px 15px 15px 60px;
        display: block;
        line-height: 1.2;
        transition: color 0.4s;
        font-weight: 400;
        color: #484848;
    }
    todo-item .toggle:checked + label {
        background-image: url("data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%22-10%20-18%20100%20135%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2250%22%20fill%3D%22none%22%20stroke%3D%22%2359A193%22%20stroke-width%3D%223%22%2F%3E%3Cpath%20fill%3D%22%233EA390%22%20d%3D%22M72%2025L42%2071%2027%2056l-4%204%2020%2020%2034-52z%22%2F%3E%3C%2Fsvg%3E");
        color: #949494;
        text-decoration: line-through;
    }
    todo-item.completed label {
        color: #949494;
        text-decoration: line-through;
    }
    todo-item .destroy {
        display: none;
        position: absolute;
        top: 0;
        right: 10px;
        bottom: 0;
        width: 40px;
        height: 40px;
        margin: auto 0;
        font-size: 30px;
        color: #949494;
        transition: color 0.2s ease-out;
        border: 0;
        background: none;
        cursor: pointer;
        padding: 0;
        appearance: none;
    }
    todo-item .destroy:hover,
    todo-item .destroy:focus {
        color: #c18585;
    }
    todo-item .destroy:after {
        content: "\\00D7";
        display: block;
        height: 100%;
        line-height: 1.1;
    }
    todo-item:hover .destroy {
        display: block;
    }
    todo-item .edit {
        display: none;
        position: relative;
        margin: 0;
        width: 100%;
        font-size: 24px;
        font-family: inherit;
        font-weight: inherit;
        line-height: 1.4em;
        color: inherit;
        padding: 6px;
        border: 1px solid #999;
        box-shadow: inset 0 -1px 5px 0 rgba(0, 0, 0, 0.2);
        box-sizing: border-box;
    }
`;

TodoItem.reg('todo-item');
