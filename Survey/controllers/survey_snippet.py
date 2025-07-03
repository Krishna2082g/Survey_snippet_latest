from odoo import http
from odoo.http import request
import logging

_logger = logging.getLogger(__name__)


class SurveySnippetController(http.Controller):

    # ✅ Full survey data for frontend rendering
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

    # ✅ Lightweight survey list for editor dropdown
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

    # ✅ Save answers from frontend
    @http.route("/survey_snippet/submit", type="json", auth="public", methods=["POST"], website=True)
    def submit_survey(self, survey_id=None, answers=None, **kwargs):
        if not survey_id or not answers:
            return {"error": "Missing survey_id or answers"}

        try:
            survey = request.env["survey.survey"].sudo().browse(int(survey_id))
            if not survey.exists():
                return {"error": "Invalid survey_id"}

            user_input = request.env["survey.user_input"].sudo().create({
                "survey_id": survey.id,
                "state": "done",
            })

            for question_index_str, suggested_answer_id in answers.items():
                question_index = int(question_index_str)
                if question_index >= len(survey.question_ids):
                    continue

                question = survey.question_ids[question_index]
                answer_id = int(suggested_answer_id)

                valid_answer = question.suggested_answer_ids.filtered(
                    lambda a: a.id == answer_id
                )
                if not valid_answer:
                    continue

                request.env["survey.user_input.line"].sudo().create({
                    "user_input_id": user_input.id,
                    "question_id": question.id,
                    "suggested_answer_id": valid_answer.id,
                    "answer_type": "char_box",
                    "value_char_box": valid_answer.value,
                })

            return {"success": True, "response_id": user_input.id}

        except Exception as e:
            _logger.error("Error submitting survey: %s", str(e))
            return {"error": f"Failed to save response: {str(e)}"}