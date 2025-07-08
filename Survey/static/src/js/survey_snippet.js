odoo.define('Survey.survey_snippet', function (require) {
    'use strict';

    const publicWidget = require('web.public.widget');
    const ajax = require('web.ajax');

    publicWidget.registry.SurveySnippet = publicWidget.Widget.extend({
        selector: '.s_survey_snippet',

        start: async function () {
            this.container = this.el.querySelector('.survey-content');
            if (!this.container) return;

            this.currentIndex = 0;
            this.answers = {};
            this.selectedSurvey = null;

            const preSelectedId = this.el.getAttribute('data-sel-survey-id');
            if (preSelectedId) {
                await this.loadPreSelectedSurvey(parseInt(preSelectedId));
            } else {
                const allSurveys = await ajax.jsonRpc('/survey_snippet/data', 'call', {});
                if (!allSurveys || allSurveys.length === 0) {
                    this.container.innerHTML = "<p>No surveys available.</p>";
                    return;
                }
                this.renderSurveySelector(allSurveys);
            }
        },

        loadPreSelectedSurvey: async function (surveyId) {
            const allSurveys = await ajax.jsonRpc('/survey_snippet/data', 'call', {});
            const survey = allSurveys.find(s => s.id === surveyId);
            if (!survey) {
                this.container.innerHTML = "<p>Selected survey not found.</p>";
                return;
            }

            this.selectedSurvey = survey;
            this.data = survey.questions;
            this.currentIndex = 0;
            this.answers = {};
            this.renderQuestion();
        },

        renderSurveySelector: function (surveys) {
            this.container.innerHTML = `
                <div class="mx-auto my-5 p-4 shadow rounded bg-white" style="max-width: 800px; width: 100%;">
                    <h5 class="text-center mb-4">Choose a Survey</h5>
                </div>
            `;

            const select = document.createElement('select');
            select.className = 'form-select mb-3';
            select.innerHTML = `<option disabled selected>-- Select Survey --</option>`;

            surveys.forEach(s => {
                const option = document.createElement('option');
                option.value = s.id;
                option.textContent = s.title;
                select.appendChild(option);
            });

            select.addEventListener('change', () => {
                const selectedId = parseInt(select.value);
                const survey = surveys.find(s => s.id === selectedId);
                if (!survey) return;

                this.selectedSurvey = survey;
                this.data = survey.questions;
                this.currentIndex = 0;
                this.answers = {};
                this.renderQuestion();
            });

            const wrapper = this.container.querySelector('div');
            wrapper.appendChild(select);
        },

        renderQuestion: function () {
            const question = this.data[this.currentIndex];
            const qType = question.question_type || 'simple_choice';

            this.container.innerHTML = `
                <div class="mx-auto my-5 p-4 shadow rounded bg-white" style="max-width: 800px; width: 100%;">
                    <h5 class="mb-4">${this.currentIndex + 1}. ${question.text}</h5>
                    <div id="optionsContainer"></div>
                    <div class="d-flex justify-content-between mt-4" id="navButtons"></div>
                    <div class="mt-4">
                        <div class="progress">
                            <div class="progress-bar" style="width: ${((this.currentIndex + 1) / this.data.length) * 100}%"></div>
                        </div>
                        <small class="text-muted">Question ${this.currentIndex + 1} of ${this.data.length}</small>
                    </div>
                </div>
            `;

            const optionsDiv = this.container.querySelector('#optionsContainer');

            if (qType === 'simple_choice') {
                question.answers.forEach(answer => {
                    const option = document.createElement('div');
                    option.className = 'border rounded p-3 mb-2 w-100';
                    option.style.cursor = 'pointer';
                    option.style.transition = '0.2s';
                    option.textContent = answer.text;
                    option.setAttribute('data-id', answer.id);

                    if (this.answers[this.currentIndex] === answer.id) {
                        option.classList.add('bg-primary', 'text-white');
                    }

                    option.addEventListener('mouseenter', function () {
                        if (!this.classList.contains('bg-primary')) {
                            this.style.backgroundColor = '#f1f1f1';
                        }
                    });

                    option.addEventListener('mouseleave', function () {
                        if (!this.classList.contains('bg-primary')) {
                            this.style.backgroundColor = '#fff';
                        }
                    });

                    option.addEventListener('click', () => {
                        optionsDiv.querySelectorAll('div').forEach(opt => {
                            opt.classList.remove('bg-primary', 'text-white');
                            opt.style.backgroundColor = '#fff';
                        });
                        option.classList.add('bg-primary', 'text-white');
                        this.answers[this.currentIndex] = answer.id;
                    });

                    optionsDiv.appendChild(option);
                });
            } else if (qType === 'multiple_choice') {
                question.answers.forEach(answer => {
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.value = answer.id;
                    checkbox.className = 'form-check-input me-2';
                    if ((this.answers[this.currentIndex] || []).includes(answer.id)) {
                        checkbox.checked = true;
                    }
                    checkbox.addEventListener('change', () => {
                        if (!this.answers[this.currentIndex]) {
                            this.answers[this.currentIndex] = [];
                        }
                        if (checkbox.checked) {
                            this.answers[this.currentIndex].push(answer.id);
                        } else {
                            this.answers[this.currentIndex] = this.answers[this.currentIndex].filter(id => id !== answer.id);
                        }
                    });
                    const label = document.createElement('label');
                    label.className = 'form-check-label';
                    label.textContent = answer.text;
                    const wrapper = document.createElement('div');
                    wrapper.className = 'form-check mb-2';
                    wrapper.appendChild(checkbox);
                    wrapper.appendChild(label);
                    optionsDiv.appendChild(wrapper);
                });
            } else if (qType === 'text_box' || qType === 'text_box_multiple_line' || qType === 'char_box') {
                const input = document.createElement(qType === 'char_box' ? 'input' : 'textarea');
                input.className = 'form-control';
                input.value = this.answers[this.currentIndex] || '';
                input.placeholder = 'Your answer here';
                input.addEventListener('input', () => {
                    this.answers[this.currentIndex] = input.value;
                });
                optionsDiv.appendChild(input);
            }  else if (qType === 'numerical_box') {
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'form-control';
                input.value = this.answers[this.currentIndex] || '';
                input.placeholder = 'Enter a number';
                input.addEventListener('input', () => {
                    // Store as string but validate it's a valid number
                    const value = input.value.trim();
                    if (value === '') {
                        this.answers[this.currentIndex] =null;
                    } else if (!isNaN(value)) {
                        this.answers[this.currentIndex] = parseFloat(value);
                    }
                });
                optionsDiv.appendChild(input);
            } else if (qType === 'date') {
                const input = document.createElement('input');
                input.type = 'date';
                input.className = 'form-control';
                input.value = this.answers[this.currentIndex] || '';
                input.addEventListener('input', () => {
                    this.answers[this.currentIndex] = input.value;
                });
                optionsDiv.appendChild(input);
            } else if (qType === 'datetime') {
                const input = document.createElement('input');
                input.type = 'datetime-local';
                input.className = 'form-control';
                input.value = this.answers[this.currentIndex] || '';
                input.addEventListener('input', () => {
                    this.answers[this.currentIndex] = input.value;
                });
                optionsDiv.appendChild(input);
            }

            const navButtons = this.container.querySelector('#navButtons');

            if (this.currentIndex > 0) {
                const prevBtn = document.createElement('button');
                prevBtn.className = 'btn btn-secondary';
                prevBtn.textContent = 'Previous';
                prevBtn.addEventListener('click', () => this.previousQuestion());
                navButtons.appendChild(prevBtn);
            }

            const nextBtn = document.createElement('button');
            nextBtn.className = 'btn btn-primary ms-auto';
            nextBtn.textContent = this.currentIndex === this.data.length - 1 ? 'Submit' : 'Next';
            nextBtn.addEventListener('click', () => this.nextQuestion());
            navButtons.appendChild(nextBtn);
        },

        previousQuestion: function () {
            if (this.currentIndex > 0) {
                this.currentIndex--;
                this.renderQuestion();
            }
        },

        nextQuestion: function () {
            const answer = this.answers[this.currentIndex];
            if (answer === undefined || answer === null || (Array.isArray(answer) && answer.length === 0)) {
                alert('Please answer before continuing.');
                return;
            }

            if (this.currentIndex < this.data.length - 1) {
                this.currentIndex++;
                this.renderQuestion();
            } else {
                this.submitSurvey();
            }
        },

        submitSurvey: function () {
            this.container.innerHTML = `
                <div class="text-center py-5">
                    <div class="spinner-border text-primary mb-3"></div>
                    <h5>Submitting your response...</h5>
                </div>
            `;

            ajax.jsonRpc('/survey_snippet/submit', 'call', {
                survey_id: this.selectedSurvey.id,
                answers: this.answers,
            }).then((result) => {
                if (result.success) {
                    this.container.innerHTML = `
                        <div class="text-center py-5">
                            <i class="fa fa-check-circle text-success mb-3" style="font-size: 4rem;"></i>
                            <h4 class="text-success">Thank you!</h4>
                            <p>Your answers have been recorded successfully.</p>
                        </div>
                    `;
                } else {
                    this.container.innerHTML = `
                        <div class="text-center py-5 text-danger">
                            <h5>Error: ${result.error || 'Submission failed.'}</h5>
                            <button class="btn btn-primary mt-3" onclick="location.reload()">Try Again</button>
                        </div>
                    `;
                }
            }).catch(() => {
                this.container.innerHTML = `
                    <div class="text-center py-5 text-danger">
                        <h5>Server error. Please try again later.</h5>
                        <button class="btn btn-primary mt-3" onclick="location.reload()">Try Again</button>
                    </div>
                `;
            });
        },
    });
});