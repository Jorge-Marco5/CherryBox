
class ModalHandler {
    constructor() {
        this.modal = document.getElementById('modal');
        this.activeResolve = null;
        this.activeAbortController = null;
        this.previousActiveElement = null;

        if (this.modal) {
            this.modal.setAttribute('role', 'dialog');
            this.modal.setAttribute('aria-modal', 'true');

            this.modalHead = this.modal.querySelector('.modal-head');
            this.modalBody = this.modal.querySelector('.modal-body');
            this.modalFooter = this.modal.querySelector('.modal-footer');

            const titleEl = this.modalHead?.querySelector('.modal-title h4');
            if (titleEl) {
                if (!titleEl.id) titleEl.id = 'modal-title-heading';
                this.modal.setAttribute('aria-labelledby', titleEl.id);
            }

            const descEl = this.modalHead?.querySelector('.modal-text p');
            if (descEl) {
                if (!descEl.id) descEl.id = 'modal-desc-heading';
                this.modal.setAttribute('aria-describedby', descEl.id);
            }

            // Cerrar al hacer clic en el backdrop fuera de modal-content
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.closeModal(false);
                }
            });

            // Cerrar con tecla Escape y contención de foco (Focus Trap)
            document.addEventListener('keydown', (e) => {
                if (!this.modal.classList.contains('active')) return;

                if (e.key === 'Escape') {
                    e.preventDefault();
                    this.closeModal(false);
                    return;
                }

                if (e.key === 'Tab') {
                    const focusableElements = this.modal.querySelectorAll(
                        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                    );
                    const focusable = Array.from(focusableElements).filter((el) => el.offsetParent !== null);
                    if (focusable.length === 0) return;

                    const firstEl = focusable[0];
                    const lastEl = focusable[focusable.length - 1];

                    if (e.shiftKey) {
                        if (document.activeElement === firstEl || !this.modal.contains(document.activeElement)) {
                            e.preventDefault();
                            lastEl.focus();
                        }
                    } else {
                        if (document.activeElement === lastEl || !this.modal.contains(document.activeElement)) {
                            e.preventDefault();
                            firstEl.focus();
                        }
                    }
                }
            });

            // Listener permanente para el botón de cierre (accesible por mouse y teclado)
            const closeBtn = this.modal.querySelector('#closeModal');
            if (closeBtn) {
                closeBtn.setAttribute('role', 'button');
                closeBtn.setAttribute('aria-label', 'Cerrar ventana modal');
                closeBtn.setAttribute('tabindex', '0');

                closeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.closeModal(false);
                });

                closeBtn.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.closeModal(false);
                    }
                });
            }

            // Listener para el botón Cancelar del footer
            const cancelBtn = this.modalFooter?.querySelector('.outline');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.closeModal(false);
                });
            }
        }
    }

    /**
     * Construye y despliega un modal con formulario dinámico.
     * Puede invocarse pasando un único objeto de configuración:
     *   callModalForm({ title, description, formContent: [...], options: {...} })
     * O de forma tradicional con parámetros posicionales:
     *   callModalForm(title, description, formContent, options)
     *
     * @param {string|Object} title - Título del modal o el objeto completo de configuración
     * @param {string} [description] - Descripción o subtítulo (si se usan parámetros posicionales)
     * @param {Array<Object>|Object} [content] - Arreglo de campos o diccionario legacy
     * @param {Object} [options] - Opciones adicionales (size, type, confirmText, cancelText, etc.)
     * @returns {Promise<Object|null>} Promesa con los datos del formulario, o null si se cancela
     */
    callModalForm(title, description = '', content = [], options = {}) {
        return new Promise((resolve) => {
            if (!this.modal) {
                resolve(null);
                return;
            }

            // Guardar elemento enfocado previamente para restaurarlo al cerrar
            this.previousActiveElement = document.activeElement;

            // Cancelar cualquier promesa previa pendiente
            if (this.activeResolve) {
                this.activeResolve(null);
            }
            this.activeResolve = resolve;

            // Limpiar listeners anteriores
            this.activeAbortController?.abort();
            this.activeAbortController = new AbortController();
            const { signal } = this.activeAbortController;

            // Soporte para paso de configuración en un único objeto o parámetros separados
            let modalTitle = title;
            let modalDesc = description;
            let fieldsData = content;
            let modalOptions = options;

            if (typeof title === 'object' && title !== null && !Array.isArray(title)) {
                modalTitle = title.title || '';
                modalDesc = title.description || '';
                fieldsData = title.formContent || title.fields || title.content || [];
                modalOptions = title.options || {};
            }

            // Normalizar campos a un Array estandarizado de objetos
            let fields = [];
            if (Array.isArray(fieldsData)) {
                fields = fieldsData;
            } else if (typeof fieldsData === 'object' && fieldsData !== null) {
                // Compatibilidad con objetos legacy { text: { ... }, email: { ... } }
                fields = Object.entries(fieldsData).map(([clave, valor]) => ({
                    type: valor.type || clave,
                    ...valor
                }));
            }

            // Aplicar tamaño si fue especificado
            this.modal.classList.remove('modal-sm', 'modal-lg', 'modal-xl', 'modal-fullscreen');
            if (modalOptions.size && modalOptions.size !== 'default') {
                this.modal.classList.add(`modal-${modalOptions.size}`);
            }

            const modalTitleEl = this.modalHead.querySelector('.modal-title h4');
            const modalDescEl = this.modalHead.querySelector('.modal-text p');

            if (modalTitleEl) modalTitleEl.textContent = String(modalTitle || '');
            if (modalDescEl) modalDescEl.textContent = String(modalDesc || '');

            this.modalBody.style.display = 'block';
            this.modalBody.innerHTML = '';

            // Configurar botones del footer (primer botón = confirmar/submit, segundo = cancelar)
            const modalActions = this.modalFooter.querySelector('.modal-actions-2');
            const btnCancel = modalActions?.querySelector('.outline, button:first-child');
            const btnSubmit = modalActions?.querySelector('button:last-child');

            if (btnCancel) {
                btnCancel.textContent = modalOptions.cancelText || 'Cancelar';
                btnCancel.style.display = modalOptions.showCancel === false ? 'none' : 'inline-flex';
            }

            if (btnSubmit) {
                btnSubmit.textContent = modalOptions.confirmText || 'Aceptar';
                btnSubmit.setAttribute('form', 'modal-form');
                btnSubmit.setAttribute('type', 'submit');
                btnSubmit.style.display = 'inline-flex';

                // Aplicar estilo de botón configurable (primary, danger, info, etc.)
                btnSubmit.classList.remove('primary', 'danger', 'info', 'warning', 'success');
                btnSubmit.classList.add(modalOptions.type || 'primary');
            }

            if (fields.length > 0) {
                const formFather = document.createElement('form');
                formFather.id = 'modal-form';

                fields.forEach((field) => {
                    const formGroup = document.createElement('div');
                    formGroup.classList.add('form-group');

                    const fieldName = field.name || '';
                    const fieldId = field.id || `${fieldName}-id`;
                    const isRequired = Boolean(field.required || field.require);
                    const onlyRead = Boolean(field.onlyRead || field.onlyread);
                    const disabled = Boolean(field.disabled || field.disabled);
                    const fieldType = (field.type || 'text').toLowerCase();
                    const hintText = field.hint || field.description;
                    const hintId = hintText ? `${fieldId}-hint` : null;

                    // 1. Etiqueta (Label) agrupada correctamente
                    if (field.label) {
                        const newLabel = document.createElement('label');
                        newLabel.textContent = field.label;
                        newLabel.setAttribute('for', fieldId);
                        if (isRequired) {
                            newLabel.classList.add('required');
                        }
                        formGroup.appendChild(newLabel);
                    }

                    // 2. Control de formulario (soporta input, textarea, select, checkbox, autocomplete)
                    let inputEl;

                    if (fieldType === 'textarea') {
                        inputEl = document.createElement('textarea');
                        if (field.placeholder) inputEl.placeholder = field.placeholder;
                        if (field.rows) inputEl.rows = field.rows;
                        if (field.value !== undefined) inputEl.value = field.value;

                        inputEl.setAttribute('name', fieldName);
                        inputEl.setAttribute('id', fieldId);
                        inputEl.required = isRequired;
                        if (onlyRead) inputEl.onlyread = onlyRead;
                        if (disabled) inputEl.disabled = disabled;
                        if (isRequired) inputEl.setAttribute('aria-required', 'true');
                        if (hintId) inputEl.setAttribute('aria-describedby', hintId);
                        formGroup.appendChild(inputEl);

                    } else if (fieldType === 'select') {
                        inputEl = document.createElement('select');

                        if (field.placeholder) {
                            const placeholderOpt = document.createElement('option');
                            placeholderOpt.value = '';
                            placeholderOpt.textContent = field.placeholder;
                            placeholderOpt.disabled = true;
                            if (field.value === undefined || field.value === null || field.value === '') {
                                placeholderOpt.selected = true;
                            }
                            inputEl.appendChild(placeholderOpt);
                        }

                        if (Array.isArray(field.options)) {
                            field.options.forEach((opt) => {
                                const optionEl = document.createElement('option');
                                const optVal = typeof opt === 'object' && opt !== null ? opt.value : opt;
                                const optLabel = typeof opt === 'object' && opt !== null ? (opt.label ?? opt.value) : opt;
                                optionEl.value = optVal !== undefined ? optVal : '';
                                optionEl.textContent = optLabel !== undefined ? optLabel : '';
                                if (field.value !== undefined && String(optVal) === String(field.value)) {
                                    optionEl.selected = true;
                                }
                                inputEl.appendChild(optionEl);
                            });
                        }

                        inputEl.setAttribute('name', fieldName);
                        inputEl.setAttribute('id', fieldId);
                        inputEl.required = isRequired;
                        if (onlyRead) inputEl.onlyread = onlyRead;
                        if (disabled) inputEl.disabled = disabled;
                        if (isRequired) inputEl.setAttribute('aria-required', 'true');
                        if (hintId) inputEl.setAttribute('aria-describedby', hintId);
                        formGroup.appendChild(inputEl);

                    } else if (fieldType === 'autocomplete' || fieldType === 'combobox') {
                        const autocompleteWrap = document.createElement('div');
                        autocompleteWrap.className = 'autocomplete-wrap';
                        autocompleteWrap.style.position = 'relative';
                        autocompleteWrap.style.width = '100%';

                        // Input oculto con el nombre del campo para almacenar el ID
                        const hiddenInput = document.createElement('input');
                        hiddenInput.type = 'hidden';
                        hiddenInput.name = fieldName;
                        hiddenInput.id = fieldId;
                        if (field.value !== undefined && field.value !== null) {
                            hiddenInput.value = field.value;
                        }

                        // Input de texto visible para la búsqueda
                        const searchInput = document.createElement('input');
                        searchInput.type = 'text';
                        searchInput.autocomplete = 'off';
                        searchInput.id = `${fieldId}-search`;
                        if (field.placeholder) searchInput.placeholder = field.placeholder;
                        if (field.initialLabel) searchInput.value = field.initialLabel;
                        searchInput.required = isRequired;
                        if (onlyRead) inputEl.onlyread = onlyRead;
                        if (disabled) inputEl.disabled = disabled;

                        if (isRequired) searchInput.setAttribute('aria-required', 'true');
                        if (hintId) searchInput.setAttribute('aria-describedby', hintId);

                        // Contenedor desplegable flotante
                        const dropdownEl = document.createElement('div');
                        dropdownEl.className = 'autocomplete-dropdown';
                        dropdownEl.style.cssText = `
                            position: absolute;
                            top: calc(100% + 4px);
                            left: 0;
                            right: 0;
                            background: var(--background-color-secondary, #1e1e24);
                            border: 1px solid var(--border, #3a3a44);
                            border-radius: 8px;
                            max-height: 200px;
                            overflow-y: auto;
                            z-index: 1050;
                            display: none;
                            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.35);
                            box-sizing: border-box;
                        `;

                        let debounceTimer = null;
                        let currentItems = [];
                        let highlightedIndex = -1;

                        const highlightItem = (index) => {
                            const itemEls = dropdownEl.querySelectorAll('.autocomplete-item');
                            itemEls.forEach((el, idx) => {
                                if (idx === index) {
                                    el.style.backgroundColor = 'var(--bg-shadow, rgba(255, 255, 255, 0.12))';
                                    el.scrollIntoView({ block: 'nearest' });
                                } else {
                                    el.style.backgroundColor = 'transparent';
                                }
                            });
                            highlightedIndex = index;
                        };

                        const selectItem = (item) => {
                            searchInput.value = item.label;
                            hiddenInput.value = item.value;
                            searchInput.setCustomValidity('');
                            dropdownEl.style.display = 'none';
                            highlightedIndex = -1;
                            if (typeof field.onSelect === 'function') {
                                field.onSelect(item);
                            }
                        };

                        const renderResults = (items) => {
                            dropdownEl.innerHTML = '';
                            currentItems = items || [];
                            highlightedIndex = -1;

                            if (!currentItems.length) {
                                const emptyEl = document.createElement('div');
                                emptyEl.style.cssText = 'padding: 10px 14px; font-size: 0.85rem; color: var(--secondary, #888);';
                                emptyEl.textContent = 'Sin resultados coincidentes';
                                dropdownEl.appendChild(emptyEl);
                                dropdownEl.style.display = 'block';
                                return;
                            }

                            currentItems.forEach((item, idx) => {
                                const itemEl = document.createElement('div');
                                itemEl.className = 'autocomplete-item';
                                itemEl.style.cssText = `
                                    padding: 8px 14px;
                                    cursor: pointer;
                                    display: flex;
                                    flex-direction: row;
                                    justify-content: space-between;
                                    align-items: center;
                                    gap: 8px;
                                    border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.05));
                                    transition: background-color 0.15s ease;
                                `;

                                const labelEl = document.createElement('span');
                                labelEl.style.cssText = 'font-weight: 500; font-size: 0.9rem; color: var(--text, #fff);';
                                labelEl.textContent = item.label;
                                itemEl.appendChild(labelEl);

                                if (item.hint) {
                                    const hintEl = document.createElement('small');
                                    hintEl.style.cssText = 'font-size: 0.78rem; opacity: 0.7; color: var(--secondary, #aaa);';
                                    hintEl.textContent = item.hint;
                                    itemEl.appendChild(hintEl);
                                }

                                itemEl.addEventListener('mouseenter', () => highlightItem(idx));
                                itemEl.addEventListener('mousedown', (e) => {
                                    e.preventDefault();
                                    selectItem(item);
                                });

                                dropdownEl.appendChild(itemEl);
                            });

                            dropdownEl.style.display = 'block';
                        };

                        searchInput.addEventListener('input', (e) => {
                            const query = e.target.value.trim();
                            hiddenInput.value = '';
                            if (isRequired) {
                                searchInput.setCustomValidity('Selecciona una opción válida de la lista');
                            }

                            clearTimeout(debounceTimer);
                            if (!query) {
                                dropdownEl.style.display = 'none';
                                return;
                            }

                            debounceTimer = setTimeout(async () => {
                                try {
                                    if (typeof field.onSearch === 'function') {
                                        const results = await field.onSearch(query);
                                        renderResults(results);
                                    } else if (Array.isArray(field.options)) {
                                        const filtered = field.options.filter((opt) => {
                                            const text = typeof opt === 'object' ? opt.label : String(opt);
                                            return text.toLowerCase().includes(query.toLowerCase());
                                        }).map((opt) => (typeof opt === 'object' ? opt : { label: opt, value: opt }));
                                        renderResults(filtered);
                                    }
                                } catch (err) {
                                    console.error("Error en búsqueda autocomplete:", err);
                                }
                            }, 250);
                        });

                        searchInput.addEventListener('keydown', (e) => {
                            if (dropdownEl.style.display === 'block') {
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    const nextIndex = (highlightedIndex + 1) % currentItems.length;
                                    highlightItem(nextIndex);
                                } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    const prevIndex = (highlightedIndex - 1 + currentItems.length) % currentItems.length;
                                    highlightItem(prevIndex);
                                } else if (e.key === 'Enter') {
                                    if (highlightedIndex >= 0 && highlightedIndex < currentItems.length) {
                                        e.preventDefault();
                                        selectItem(currentItems[highlightedIndex]);
                                    }
                                } else if (e.key === 'Escape') {
                                    dropdownEl.style.display = 'none';
                                }
                            }
                        });

                        searchInput.addEventListener('blur', () => {
                            setTimeout(() => {
                                dropdownEl.style.display = 'none';
                                if (isRequired && !hiddenInput.value) {
                                    searchInput.setCustomValidity('Selecciona una opción válida de la lista');
                                }
                            }, 180);
                        });

                        autocompleteWrap.appendChild(hiddenInput);
                        autocompleteWrap.appendChild(searchInput);
                        autocompleteWrap.appendChild(dropdownEl);
                        formGroup.appendChild(autocompleteWrap);

                    } else {
                        inputEl = document.createElement('input');
                        inputEl.setAttribute('type', fieldType);
                        if (field.placeholder) inputEl.setAttribute('placeholder', field.placeholder);
                        if (field.step !== undefined) inputEl.setAttribute('step', field.step);
                        if (field.min !== undefined) inputEl.setAttribute('min', field.min);
                        if (field.max !== undefined) inputEl.setAttribute('max', field.max);
                        if (field.value !== undefined) {
                            if (fieldType === 'checkbox') {
                                inputEl.checked = Boolean(field.value);
                            } else {
                                inputEl.setAttribute('value', field.value);
                            }
                        }

                        inputEl.setAttribute('name', fieldName);
                        inputEl.setAttribute('id', fieldId);
                        inputEl.required = isRequired;
                        if (onlyRead) inputEl.onlyread = onlyRead;
                        if (disabled) inputEl.disabled = disabled;

                        // Accesibilidad de controles
                        if (isRequired) {
                            inputEl.setAttribute('aria-required', 'true');
                        }
                        if (hintId) {
                            inputEl.setAttribute('aria-describedby', hintId);
                        }

                        formGroup.appendChild(inputEl);
                    }

                    // 3. Texto de ayuda opcional (hint / description)
                    if (hintText) {
                        const hintEl = document.createElement('span');
                        hintEl.className = 'form-hint';
                        hintEl.id = hintId;
                        hintEl.textContent = hintText;
                        formGroup.appendChild(hintEl);
                    }

                    formFather.appendChild(formGroup);
                });

                this.modalBody.appendChild(formFather);

                // Manejar submit del formulario con tipado de datos adecuado
                formFather.addEventListener('submit', async (e) => {
                    e.preventDefault();

                    // Validar campos de autocomplete requeridos
                    let hasInvalidAutocomplete = false;
                    fields.forEach((field) => {
                        const fieldType = (field.type || 'text').toLowerCase();
                        if (fieldType === 'autocomplete' || fieldType === 'combobox') {
                            const fieldName = field.name;
                            const isReq = Boolean(field.required || field.require);
                            const hiddenEl = formFather.querySelector(`input[type="hidden"][name="${fieldName}"]`);
                            const searchEl = formFather.querySelector(`#${field.id || `${fieldName}-id`}-search`);
                            if (isReq && (!hiddenEl || !hiddenEl.value)) {
                                if (searchEl) {
                                    searchEl.setCustomValidity('Selecciona una opción válida de la lista');
                                    searchEl.reportValidity();
                                    hasInvalidAutocomplete = true;
                                }
                            }
                        }
                    });

                    if (hasInvalidAutocomplete) return;

                    const rawData = Object.fromEntries(new FormData(e.target));
                    const formData = { ...rawData };

                    // Procesamiento y casteo tipado según la definición de los campos
                    fields.forEach((field) => {
                        const fieldName = field.name;
                        if (!fieldName) return;

                        const fieldType = (field.type || 'text').toLowerCase();
                        const element = formFather.elements[fieldName];

                        if (fieldType === 'checkbox' && element) {
                            formData[fieldName] = Boolean(element.checked);
                        } else if (fieldType === 'number' && element) {
                            const val = typeof element.value === 'string' ? element.value.trim() : '';
                            formData[fieldName] = val === '' ? null : Number(val);
                        } else if (fieldType === 'autocomplete' || fieldType === 'combobox') {
                            const hiddenEl = formFather.querySelector(`input[type="hidden"][name="${fieldName}"]`);
                            const val = typeof hiddenEl?.value === 'string' ? hiddenEl.value.trim() : '';
                            if (field.valueType === 'number' || (val !== '' && !isNaN(Number(val)))) {
                                formData[fieldName] = val === '' ? null : Number(val);
                            } else {
                                formData[fieldName] = val;
                            }
                        } else if (fieldType === 'select' && element) {
                            const isNumericOption = Array.isArray(field.options) && field.options.length > 0 &&
                                (typeof field.options[0] === 'number' || typeof field.options[0]?.value === 'number');
                            if (isNumericOption || field.valueType === 'number') {
                                const val = typeof element.value === 'string' ? element.value.trim() : '';
                                formData[fieldName] = val === '' ? null : Number(val);
                            } else {
                                formData[fieldName] = element.value;
                            }
                        }
                    });

                    if (this.activeResolve) {
                        const cb = this.activeResolve;
                        this.activeResolve = null;
                        this.closeModal(formData);
                        cb(formData);
                    }
                }, { signal });
            }

            requestAnimationFrame(() => {
                this.modal.classList.add('active');
                setTimeout(() => {
                    const autoFocusTarget = this.modalBody.querySelector('input:not([type="hidden"]), select, textarea') || btnSubmit;
                    autoFocusTarget?.focus();
                }, 50);
            });
        });
    }

    /**
     * Construye y despliega un modal de confirmación.
     * Retorna true si el usuario presiona Aceptar/Confirmar, o false si presiona Cancelar, la 'X', Escape o hace clic fuera.
     * @param {string} title - Título del diálogo
     * @param {string} question - Pregunta o mensaje explicativo
     * @param {Object} options - { type: 'primary' | 'danger', confirmText, cancelText, size, bodyContent }
     * @returns {Promise<boolean>} Retorna true al confirmar, false al rechazar o cerrar
     */
    callModalConfirm(title, question, options = {}) {
        return new Promise((resolve) => {
            if (!this.modal) {
                resolve(false);
                return;
            }

            // Guardar elemento enfocado previamente para restaurarlo al cerrar
            this.previousActiveElement = document.activeElement;

            // Cancelar cualquier promesa previa pendiente
            if (this.activeResolve) {
                this.activeResolve(false);
            }
            this.activeResolve = resolve;

            // Limpiar listeners anteriores para evitar llamadas duplicadas
            this.activeAbortController?.abort();
            this.activeAbortController = new AbortController();
            const { signal } = this.activeAbortController;

            // Tamaño (por defecto 'sm' es ideal para confirmaciones)
            this.modal.classList.remove('modal-sm', 'modal-lg', 'modal-xl', 'modal-fullscreen');
            this.modal.classList.add(`modal-${options.size || 'sm'}`);

            // Textos de título y descripción
            const modalTitleEl = this.modalHead.querySelector('.modal-title h4');
            const modalDescEl = this.modalHead.querySelector('.modal-text p');

            if (modalTitleEl) modalTitleEl.textContent = String(title || 'Confirmación');
            if (modalDescEl) modalDescEl.textContent = String(question || '');

            // Contenido opcional en el cuerpo
            if (options.bodyContent) {
                this.modalBody.innerHTML = options.bodyContent;
                this.modalBody.style.display = 'block';
            } else {
                this.modalBody.innerHTML = '';
                this.modalBody.style.display = 'none';
            }

            // Configurar botones del footer (primer botón = confirmar, segundo = cancelar)
            const modalActions = this.modalFooter.querySelector('.modal-actions-2');
            const btnCancel = modalActions?.querySelector('.outline, button:first-child');
            const btnConfirm = modalActions?.querySelector('button:last-child');

            if (btnCancel) {
                btnCancel.textContent = options.cancelText || 'Cancelar';
                btnCancel.style.display = options.showCancel === false ? 'none' : 'inline-flex';
            }

            if (btnConfirm) {
                btnConfirm.textContent = options.confirmText || 'Aceptar';
                btnConfirm.removeAttribute('form');
                btnConfirm.setAttribute('type', 'button');
                btnConfirm.style.display = 'inline-flex';

                // Variantes de botón (ej. 'danger' para acciones destructivas como eliminar)
                btnConfirm.classList.remove('primary', 'danger', 'info', 'warning', 'success');
                btnConfirm.classList.add(options.type || 'primary');

                // Al hacer clic en Confirmar -> resolver true y cerrar
                btnConfirm.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (this.activeResolve) {
                        const cb = this.activeResolve;
                        this.activeResolve = null;
                        this.closeModal(true);
                        cb(true);
                    }
                }, { signal });
            }

            requestAnimationFrame(() => {
                this.modal.classList.add('active');
                setTimeout(() => {
                    btnConfirm?.focus();
                }, 50);
            });
        });
    }

    /**
     * Construye y despliega un modal para mostrar algún mensaje o aviso al usuario.
     * Retorna una Promesa que resuelve a true al confirmar o cerrar.
     * @param {string} title - Título del diálogo
     * @param {string} message - Mensaje o aviso al usuario
     * @param {Object} options - { type: 'primary' | 'danger', confirmText, size, bodyContent }
     * @returns {Promise<boolean>} Promesa resuelta cuando el usuario interactúa con el modal
     */
    callModalMessage(title, message, options = {}) {
        return new Promise((resolve) => {
            if (!this.modal) {
                resolve(false);
                return;
            }

            // Guardar elemento enfocado previamente para restaurarlo al cerrar
            this.previousActiveElement = document.activeElement;

            // Cancelar cualquier promesa previa pendiente
            if (this.activeResolve) {
                this.activeResolve(false);
            }
            this.activeResolve = resolve;

            // Limpiar listeners anteriores para evitar llamadas duplicadas
            this.activeAbortController?.abort();
            this.activeAbortController = new AbortController();
            const { signal } = this.activeAbortController;

            // Tamaño (por defecto 'sm' es ideal para avisos)
            this.modal.classList.remove('modal-sm', 'modal-lg', 'modal-xl', 'modal-fullscreen');
            this.modal.classList.add(`modal-${options.size || 'sm'}`);

            // Textos de título y descripción
            const modalTitleEl = this.modalHead.querySelector('.modal-title h4');
            const modalDescEl = this.modalHead.querySelector('.modal-text p');

            if (modalTitleEl) modalTitleEl.textContent = String(title || 'Aviso');
            if (modalDescEl) modalDescEl.textContent = String(message || '');

            // Contenido opcional en el cuerpo
            if (options.bodyContent) {
                this.modalBody.innerHTML = options.bodyContent;
                this.modalBody.style.display = 'block';
            } else {
                this.modalBody.innerHTML = '';
                this.modalBody.style.display = 'none';
            }

            // Configurar botones del footer (en aviso se oculta cancelar)
            const modalActions = this.modalFooter.querySelector('.modal-actions-2');
            const btnCancel = modalActions?.querySelector('.outline, button:first-child');
            const btnConfirm = modalActions?.querySelector('button:last-child');

            if (btnCancel) {
                btnCancel.style.display = 'none';
            }

            if (btnConfirm) {
                btnConfirm.textContent = options.confirmText || 'Aceptar';
                btnConfirm.removeAttribute('form');
                btnConfirm.setAttribute('type', 'button');
                btnConfirm.style.display = 'inline-flex';

                btnConfirm.classList.remove('primary', 'danger', 'info', 'warning', 'success');
                btnConfirm.classList.add(options.type || 'primary');

                // Al hacer clic en Aceptar -> resolver true y cerrar
                btnConfirm.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (this.activeResolve) {
                        const cb = this.activeResolve;
                        this.activeResolve = null;
                        this.closeModal(true);
                        cb(true);
                    }
                }, { signal });
            }

            requestAnimationFrame(() => {
                this.modal.classList.add('active');
                setTimeout(() => {
                    btnConfirm?.focus();
                }, 50);
            });
        });
    }

    /**
     * Cierra el modal y resuelve la promesa activa (false/null por defecto si se cerró sin confirmar).
     * @param {*} [result=false] - Valor con el que se resuelve la promesa pendiente
     */
    closeModal(result = false) {
        if (!this.modal) return;

        // Si hay una promesa esperando resolverse (por ejemplo por Cancelar, Escape, 'X' o backdrop)
        if (this.activeResolve) {
            const cb = this.activeResolve;
            this.activeResolve = null;
            cb(result);
        }

        // Limpiar listeners de la acción actual
        this.activeAbortController?.abort();
        this.activeAbortController = null;

        // Si no está activo o ya se está cerrando, salir
        if (!this.modal.classList.contains('active') || this.modal.classList.contains('closing')) {
            return;
        }

        // Iniciar animación de salida
        this.modal.classList.remove('active');
        this.modal.classList.add('closing');

        // Escuchar animación de salida en .modal-content (que tiene la duración completa de salida)
        const modalContent = this.modal.querySelector('.modal-content');
        const animTarget = modalContent || this.modal;

        let isCleanedUp = false;
        const finishCleanup = () => {
            if (isCleanedUp) return;
            isCleanedUp = true;
            animTarget.removeEventListener('animationend', onAnimationEnd);
            this.cleanupModalDOM();
        };

        const onAnimationEnd = (e) => {
            if (e.target === animTarget) {
                finishCleanup();
            }
        };

        animTarget.addEventListener('animationend', onAnimationEnd);

        // Fallback de seguridad por si animationend no se dispara en el entorno
        setTimeout(() => {
            if (this.modal.classList.contains('closing')) {
                finishCleanup();
            }
        }, 250);
    }

    /**
     * Limpia el estado y contenido del modal tras completarse la animación de salida
     */
    cleanupModalDOM() {
        this.modal.classList.remove('closing');
        this.modalBody.innerHTML = '';
        this.modalBody.style.display = 'block';
        const modalTitleEl = this.modalHead?.querySelector('.modal-title h4');
        const modalDescEl = this.modalHead?.querySelector('.modal-text p');
        if (modalTitleEl) modalTitleEl.textContent = '';
        if (modalDescEl) modalDescEl.textContent = '';

        // Restaurar botones del footer a su estado estándar
        const modalActions = this.modalFooter?.querySelector('.modal-actions-2');
        const btnConfirm = modalActions?.querySelector('button:first-child');
        const btnCancel = modalActions?.querySelector('.outline, button:last-child');

        if (btnConfirm) {
            btnConfirm.classList.remove('danger', 'info', 'warning', 'success');
            btnConfirm.classList.add('primary');
            btnConfirm.textContent = 'Aceptar';
            btnConfirm.removeAttribute('form');
            btnConfirm.setAttribute('type', 'button');
            btnConfirm.style.display = 'inline-flex';
        }

        if (btnCancel) {
            btnCancel.textContent = 'Cancelar';
            btnCancel.style.display = 'inline-flex';
        }

        this.modal.classList.remove('modal-sm', 'modal-lg', 'modal-xl', 'modal-fullscreen');

        // Restaurar el foco al elemento que abrió el modal
        if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
            this.previousActiveElement.focus();
            this.previousActiveElement = null;
        }
    }
}

const modalHandler = new ModalHandler();
window.modalHandler = modalHandler;