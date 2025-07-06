from odoo import http
from odoo.http import request
import logging

_logger = logging.getLogger(__name__)

class SurveySnippetController(http.Controller):

    @http.route("/survey_snippet/data", type="json", auth="public", website=True)
    def get_surveys(self):
        try:
            surveys = request.env["survey.survey"].sudo().search([])
            data = []
            for survey in surveys:
                questions = []
                for question in survey.question_ids:
                    questions.append({
                        "id": question.id,
                        "text": question.title,
                        "question_type": question.question_type or "simple_choice",
                        "answers": [
                            {"id": a.id, "text": a.value}
                            for a in question.suggested_answer_ids
                        ],
                    })
                data.append({
                    "id": survey.id,
                    "title": survey.title,
                    "questions": questions,
                })
            return data
        except Exception as e:
            _logger.error("Error fetching survey data: %s", str(e))
            return {"error": str(e)}

    @http.route("/survey_snippet/list", type="json", auth="public", website=True)
    def get_survey_titles(self):
        try:
            surveys = request.env["survey.survey"].sudo().search([])
            _logger.info("Found %d surveys for dropdown", len(surveys))

            result = []
            for survey in surveys:
                result.append({
                    "id": survey.id,
                    "title": survey.title or f"Survey {survey.id}"
                })

            _logger.info("Returning survey list: %s", result)
            return result

        except Exception as e:
            _logger.error("Error fetching survey list: %s", str(e))
            return {"error": str(e)}

    @http.route("/survey_snippet/submit", type="json", auth="public", methods=["POST"], website=True)
    def submit_survey(self, survey_id=None, answers=None, **kwargs):
        if not survey_id or answers is None:
            return {"error": "Missing survey_id or answers"}

        try:
            survey = request.env["survey.survey"].sudo().browse(int(survey_id))
            if not survey.exists():
                return {"error": "Invalid survey_id"}

            user_input = request.env["survey.user_input"].sudo().create({
                "survey_id": survey.id,
                "state": "done",
            })

            for question_index_str, value in answers.items():
                question_index = int(question_index_str)
                if question_index >= len(survey.question_ids):
                    continue

                question = survey.question_ids[question_index]
                q_type = question.question_type or "simple_choice"

                if q_type == 'simple_choice':
                    answer_id = int(value)
                    answer = question.suggested_answer_ids.filtered(lambda a: a.id == answer_id)
                    if answer:
                        request.env["survey.user_input.line"].sudo().create({
                            "user_input_id": user_input.id,
                            "question_id": question.id,
                            "suggested_answer_id": answer.id,
                            "answer_type": "char_box",
                            "value_char_box": answer.value,
                        })

                elif q_type == 'multiple_choice':
                    for ans_id in value:
                        answer = question.suggested_answer_ids.filtered(lambda a: a.id == ans_id)
                        if answer:
                            request.env["survey.user_input.line"].sudo().create({
                                "user_input_id": user_input.id,
                                "question_id": question.id,
                                "suggested_answer_id": answer.id,
                                "answer_type": "char_box",
                                "value_char_box": answer.value,
                            })

                elif q_type in ['text_box', 'text_box_multiple_line']:
                    request.env["survey.user_input.line"].sudo().create({
                        "user_input_id": user_input.id,
                        "question_id": question.id,
                        "answer_type": "char_box",
                        "value_char_box": value,
                    })

                elif q_type == 'numerical_box':
                    try:
                        val = int(value)
                    except (ValueError, TypeError):
                        val = 0
                    request.env["survey.user_input.line"].sudo().create({
                        "user_input_id": user_input.id,
                        "question_id": question.id,
                        "answer_type": "number",
                        "value_number": val,
                    })

                elif q_type == 'date':
                    request.env["survey.user_input.line"].sudo().create({
                        "user_input_id": user_input.id,
                        "question_id": question.id,
                        "answer_type": "date",
                        "value_date": value,
                    })

                elif q_type == 'datetime':
                    request.env["survey.user_input.line"].sudo().create({
                        "user_input_id": user_input.id,
                        "question_id": question.id,
                        "answer_type": "datetime",
                        "value_datetime": value,
                    })

            return {"success": True, "response_id": user_input.id}

        except Exception as e:
            _logger.error("Error submitting survey: %s", str(e))
            return {"error": f"Failed to save response: {str(e)}"}
