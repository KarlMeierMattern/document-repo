"""Classify the document into one of the known types."""

NAME = "classifier"

DOC_TYPES = [
    "warranty",
    "prescription",
    "lab_result",
    "insurance_card",
    "invoice",
    "receipt",
    "vehicle_registration",
    "vaccination_record",
    "id_document",
    "dna_report",
    "medical_record",
    "photo",
    "generic",
]

SYSTEM_PROMPT = """You are classifying images of personal documents into one type.
Pick the SINGLE best match from the provided enum. If unsure, prefer 'generic'.
'photo' is for non-document images (vacation photo, casual snapshot). 'generic'
is for documents whose type isn't in the list (notes, letters, contracts).
"""

TOOL = {
    "name": "set_doc_type",
    "description": "Set the classified document type.",
    "input_schema": {
        "type": "object",
        "properties": {
            "doc_type": {
                "type": "string",
                "enum": DOC_TYPES,
            },
            "rationale": {
                "type": "string",
                "description": "One sentence explaining the choice. Used for debugging only.",
            },
        },
        "required": ["doc_type"],
    },
}
