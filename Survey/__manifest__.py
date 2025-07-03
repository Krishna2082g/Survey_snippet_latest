{
    "name": "Interactive Survey Snippet",
    "version": "1.0",
    "category": "Website",
    "summary": "Interactive survey snippet with one question at a time",
    "description": "Adds an interactive survey snippet to the website editor that displays one question at a time with navigation.",
    # 'depends': ['website', 'sale', 'website_payment', 'website_mail', 'portal_rating', 'digest'],
    "depends": ["website", "survey", "web_editor"],
    "license": "LGPL-3",
    "data": [
        "views/basic_snippet_template.xml",
        "views/snippet_snippet_structure.xml",
        "views/survey_form_button.xml",
        "views/survey_snippet_options.xml",
    ],
    "assets": {
        "web.assets_frontend": [
            "Survey/static/src/js/survey_snippet.js",
        ],
        "website.assets_editor": [
            "Survey/static/src/js/survey_snippet_options.js",
            "Survey/static/src/scss/survey_snippet_editor.scss",
        ],
    },
    "installable": True,
    "application": True,
    "auto_install": False,
}
