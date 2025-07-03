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
            this.renderSurveyInfo();
        },

        renderSurveyInfo: function () {
            this.container.innerHTML = `
                <div class="mx-auto my-5 p-4 shadow rounded bg-white" style="max-width: 420px;">
                    <h4 class="mb-3 text-center">${this.selectedSurvey.title}</h4>
                    <p class="text-muted text-center">${this.selectedSurvey.description || ''}</p>
                    <p class="text-center text-muted">Questions: ${this.data.length}</p>
                    <div class="text-center mt-4">
                        <button class="btn btn-success px-4" id="startSurveyBtn">Start Survey</button>
                    </div>
                </div>
            `;

            this.container.querySelector('#startSurveyBtn').addEventListener('click', () => {
                this.renderQuestion();
            });
        },

        renderSurveySelector: function (surveys) {
            this.container.innerHTML = `
                <div class="mx-auto my-5 p-4 shadow rounded bg-white" style="max-width: 420px;">
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

            const button = document.createElement('button');
            button.className = 'btn btn-primary w-100';
            button.textContent = 'Start Survey';

            button.addEventListener('click', () => {
                const selectedId = parseInt(select.value);
                const survey = surveys.find(s => s.id === selectedId);
                if (!survey) return alert('Please select a valid survey.');

                this.selectedSurvey = survey;
                this.data = survey.questions;
                this.currentIndex = 0;
                this.answers = {};
                this.renderQuestion();
            });

            const wrapper = this.container.querySelector('div');
            wrapper.appendChild(select);
            wrapper.appendChild(button);
        },

        renderQuestion: function () {
            const question = this.data[this.currentIndex];

            this.container.innerHTML = `
                <div class="mx-auto my-5 p-4 shadow rounded bg-white" style="max-width: 420px;">
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

            question.answers.forEach(answer => {
                const option = document.createElement('div');
                option.className = 'border rounded p-3 mb-2';
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
            if (this.answers[this.currentIndex] === undefined) {
                alert('Please select an answer before continuing.');
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
                            <button class="btn btn-outline-primary mt-3" onclick="location.reload()">Take Another Survey</button>
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
