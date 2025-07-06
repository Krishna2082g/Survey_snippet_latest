odoo.define('Survey.survey_snippet_options', function (require) {
    'use strict';

    const options = require('web_editor.snippets.options');
    const ajax = require('web.ajax');

    options.registry.SurveySnippetOptions = options.Class.extend({
        start() {
            return this._super(...arguments).then(() => {
                this._injectSurveyDropdown();
            });
        },

        async _injectSurveyDropdown() {
            try {
                const surveys = await ajax.jsonRpc('/survey_snippet/list', 'call', {});
                const selectWrapper = this.el.querySelector('we-select[data-attribute="data-sel-survey-id"]');
                if (!selectWrapper) {
                    console.warn('❌ <we-select> not found.');
                    return;
                }

                // Clear previous
                selectWrapper.innerHTML = '';
                selectWrapper.classList.add('o_we_snippet_option', 'survey-option-row');

                // Create label
                const label = document.createElement('label');
                label.textContent = 'Select Survey';
                label.classList.add('survey-dropdown-label');

                // Create dropdown
                const selectEl = document.createElement('select');
                selectEl.classList.add('survey-dropdown');
                selectEl.style.backgroundColor = '#595964';

                // Add placeholder (not in list)
                const placeholder = document.createElement('option');
                placeholder.disabled = true;
                placeholder.selected = true;
                placeholder.hidden = true;
                placeholder.textContent = 'Choose a survey';
                selectEl.appendChild(placeholder);

                // Add survey options
                surveys.forEach(survey => {
                    const option = document.createElement('option');
                    option.classList.add('survey-option');
                    option.value = survey.id;
                    option.textContent = survey.title || `Survey ${survey.id}`;
                    selectEl.appendChild(option);
                });

                // Handle change
                selectEl.addEventListener('change', (e) => {
                    const selectedId = e.target.value;
                    this.changeOption(false, selectedId, null);
                });

                // Pre-select if already set
                const selectedId = this.$target.attr('data-sel-survey-id');
                if (selectedId) {
                    selectEl.value = selectedId;
                    placeholder.selected = false;
                }

                // Append label + dropdown to the wrapper
                selectWrapper.appendChild(label);
                selectWrapper.appendChild(selectEl);

            } catch (err) {
                console.error('⚠️ Failed to load surveys:', err);
            }
        },

        changeOption(previewMode, value, $opt) {
            this.$target.attr('data-sel-survey-id', value);
        }
    });
});
