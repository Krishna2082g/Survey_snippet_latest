// Survey Snippet Options for Editor
odoo.define('Survey.survey_snippet_options', function (require) {
    'use strict';

    const options = require('web_editor.snippets.options');
    const ajax = require('web.ajax');

    options.registry.SurveySnippetOptions = options.Class.extend({
        start() {
            console.log('SurveySnippetOptions: start called');
            return this._super(...arguments).then(() => {
                this._injectSurveyButtons();
            });
        },

        async _injectSurveyButtons() {
            try {
                const surveys = await ajax.jsonRpc('/survey_snippet/list', 'call', {});
                console.log('Fetched surveys:', surveys);

                const selectEl = this.el.querySelector('we-select[data-attribute="data-sel-survey-id"]');
                if (!selectEl) {
                    console.warn('❌ <we-select> element not found.');
                    return;
                }

                selectEl.classList.add('o_we_vertical', 'survey-select-wrapper');
                selectEl.innerHTML = '';

                // Default Button
                const defaultBtn = document.createElement('we-button');
                defaultBtn.setAttribute('data-value', '');
                defaultBtn.textContent = 'Select a survey';
                defaultBtn.classList.add('survey-option-btn', 'survey-default-btn');
                selectEl.appendChild(defaultBtn);

                // Add survey buttons
                surveys.forEach(survey => {
                    const btn = document.createElement('we-button');
                    btn.setAttribute('data-value', survey.id);
                    btn.textContent = `${survey.title || `Survey ${survey.id}`}`;
                    btn.classList.add('survey-option-btn');

                    btn.addEventListener('click', (e) => {
                        e.preventDefault();

                        // Clear previous active
                        selectEl.querySelectorAll('we-button').forEach(b => {
                            b.classList.remove('active');
                        });

                        // Highlight selected
                        btn.classList.add('active');

                        // Save selection
                        this.changeOption(false, survey.id, btn);
                        console.log('Survey selected:', survey.title, survey.id);
                    });

                    selectEl.appendChild(btn);
                });

                // Highlight previously selected survey if any
                const selectedId = this.$target.attr('data-sel-survey-id');
                if (selectedId) {
                    selectEl.setAttribute('data-value', selectedId);
                    const selectedBtn = selectEl.querySelector(`we-button[data-value="${selectedId}"]`);
                    if (selectedBtn) {
                        selectedBtn.classList.add('active');
                    }
                }

            } catch (err) {
                console.error('Failed to load surveys:', err);
            }
        },

        changeOption(previewMode, value, $opt) {
            this.$target.attr('data-sel-survey-id', value);
            console.log('Survey selected:', value);
        }
    });
});
