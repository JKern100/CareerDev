from pydantic import BaseModel
from uuid import UUID


class QuestionOut(BaseModel):
    question_id: str
    module: str
    prompt: str
    question_type: str
    required: bool
    options: list[str] | None = None
    min_val: int | None = None
    max_val: int | None = None
    tags: list[str] | None = None
    help_text: str | None = None
    option_hints: dict[str, str] | None = None

    model_config = {"from_attributes": True}


class ExistingAnswerOut(BaseModel):
    question_id: str
    value: str | int | float | list[str] | None = None
    confidence: int = 100


class QuestionSetOut(BaseModel):
    module: str
    module_label: str
    questions: list[QuestionOut]
    existing_answers: list[ExistingAnswerOut] = []
    progress: float  # 0.0 to 1.0
    total_questions: int
    answered_questions: int


class AnswerIn(BaseModel):
    question_id: str
    value: str | int | float | list[str]
    confidence: int = 100  # 0-100


class AnswerBatchIn(BaseModel):
    answers: list[AnswerIn]


class AnswerOut(BaseModel):
    id: UUID
    question_id: str
    value_json: dict
    confidence: int
    evidence_refs: list | None = None

    model_config = {"from_attributes": True}


class SubmitAnswersOut(BaseModel):
    answers: list[AnswerOut]
    next_module: str | None
    next_module_label: str | None
    module_complete: bool
    questionnaire_complete: bool
    progress: float  # 0.0 to 1.0


class ModuleStatusOut(BaseModel):
    module: str
    module_label: str
    total_questions: int
    answered_questions: int
    required_questions: int
    required_answered: int
    is_complete: bool


class QuestionnaireProgressOut(BaseModel):
    total_modules: int
    completed_modules: int
    total_questions: int
    answered_questions: int
    current_module: str | None
    current_question_id: str | None
    progress_pct: float
    modules: list[ModuleStatusOut]
    core_complete: bool = False
    tier2_complete: bool = False


class CoreScreenOut(BaseModel):
    screen_id: str
    screen_label: str
    screen_number: int  # 1-based across all progressive screens
    total_screens: int
    tier: int = 1  # 1 or 2
    tier1_complete: bool = False
    tier2_complete: bool = False
    questions: list[QuestionOut]
    existing_answers: list[ExistingAnswerOut] = []
    core_complete: bool = False  # backward compat (= tier1_complete)
