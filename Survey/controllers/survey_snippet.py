from odoo import http
from odoo.http import request
import logging

_logger = logging.getLogger(__name__)


class SurveySnippetController(http.Controller):

    @http.route("/survey_snippet/data", type="json", auth="public", website=True)  #see this
    def get_surveys(self):
        try:
            surveys = request.env["survey.survey"].sudo().search([]) #see this 
            data = []
            for survey in surveys:
                questions = []
                for question in survey.question_ids:
                    questions.append(
                        {
                            "id": question.id,
                            "text": question.title,
                            "question_type": question.question_type or "simple_choice",
                            "answers": [
                                {"id": a.id, "text": a.value}    #see this
                                for a in question.suggested_answer_ids
                            ],
                        }
                    )
                data.append(
                    {
                        "id": survey.id,
                        "title": survey.title,
                        "questions": questions,
                    }
                )
            return data
        except Exception as e:
            _logger.error("Error fetching survey data: %s", str(e))
            return {"error": str(e)}

    @http.route("/survey_snippet/list", type="json", auth="public", website=True)
    def get_survey_titles(self):
        try:
            surveys = request.env["survey.survey"].sudo().search([])
            result = [
                {"id": survey.id, "title": survey.title or f"Survey {survey.id}"}
                for survey in surveys
            ]
            return result
        except Exception as e:
            _logger.error("Error fetching survey list: %s", str(e))
            return {"error": str(e)}

    @http.route(# see this
        "/survey_snippet/submit",
        type="json",
        auth="public",
        methods=["POST"],
        website=True,
    )
    def submit_survey(self, survey_id=None, answers=None, **kwargs):#see this
        if not survey_id or answers is None:
            return {"error": "Missing survey_id or answers"}

        try:
            survey = request.env["survey.survey"].sudo().browse(int(survey_id))#see this
            if not survey.exists():
                return {"error": "Invalid survey_id"}

            user_input = (
                request.env["survey.user_input"]
                .sudo()
                .create(
                    {
                        "survey_id": survey.id,
                        "state": "done",
                    }
                )
            )

            for question_index_str, value in answers.items():  #see this
                try:
                    question_index = int(question_index_str)
                    if question_index >= len(survey.question_ids):
                        continue

                    question = survey.question_ids[question_index]
                    q_type = question.question_type or "simple_choice"

                    if q_type == "simple_choice":
                        answer_id = int(value)
                        answer = question.suggested_answer_ids.filtered(
                            lambda a: a.id == answer_id
                        )
                        if answer:
                            request.env["survey.user_input.line"].sudo().create(
                                {
                                    "user_input_id": user_input.id,
                                    "question_id": question.id,
                                    "suggested_answer_id": answer.id,
                                    "answer_type": "char_box",
                                    "value_char_box": answer.value,
                                }
                            )

                    elif q_type == "multiple_choice":
                        for ans_id in value:
                            answer = question.suggested_answer_ids.filtered(   #see this
                                lambda a: a.id == ans_id
                            )
                            if answer:
                                request.env["survey.user_input.line"].sudo().create(
                                    {
                                        "user_input_id": user_input.id,
                                        "question_id": question.id,
                                        "suggested_answer_id": answer.id,
                                        "answer_type": "char_box",
                                        "value_char_box": answer.value,
                                    }
                                )

                    elif q_type in ["text_box", "text_box_multiple_line", "char_box"]:      #see this
                        if value:
                            request.env["survey.user_input.line"].sudo().create(
                                {
                                    "user_input_id": user_input.id,
                                    "question_id": question.id,
                                    "answer_type": "char_box",
                                    "value_char_box": value,
                                }
                            )

                    elif q_type == "numerical_box":
                        try:
                            val = float(value) or 0.0
                            request.env["survey.user_input.line"].sudo().create(
                                {
                                    "user_input_id": user_input.id,
                                    "question_id": question.id,
                                    "answer_type": "numerical_box",
                                    "value_numerical_box": val,
                                }
                            )
                        except (ValueError, TypeError) as e:
                            _logger.warning(
                                f"Invalid numerical value '{value}' for question {question.id}: {e}"
                            )

                    elif q_type == "date": 
                                
                                request.env["survey.user_input.line"].sudo().create(
                                    {
                                        "user_input_id": user_input.id,
                                        "question_id": question.id,
                                        "answer_type": "date",
                                        "value_date": value,
                                    }
                                )
                            
                            

                    elif q_type == "datetime":
                        # import pdb; pdb.set_trace()
                        if value:
                            if value:
                                try:
                                    formatted_value=value.replace("T"," ")
                                    if len(formatted_value) == 16:
                                        formatted_value +=":00"
                                
                                    request.env["survey.user_input.line"].sudo().create(
                                {
                                    "user_input_id": user_input.id,
                                    "question_id": question.id,
                                    "answer_type": "datetime",
                                    "value_datetime": formatted_value,
                                }
                            )
                                except Exception as dt_err:
                                    _logger.warning(f"Invalid datetime value '| Error: {dt_err}")

                except Exception as q_error:
                    _logger.error(
                        f"Error processing question {question_index_str}: {q_error}"
                    )

            return {"success": True, "response_id": user_input.id}

        except Exception as e:
            _logger.error("Error submitting survey: %s", str(e))
            return {"error": f"Failed to save response: {str(e)}"}
