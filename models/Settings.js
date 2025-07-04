module.exports = {
  "$schema": "http://json-schema.org/draft-04/schema#",
  "description": "",
  "type": "object",
  "properties": {
    "primary_language": {
      "type": "string",
      "minLength": 1
    },
    "supported_languages": {
      "type": "array",
      "items": {
        "required": [],
        "properties": {}
      }
    },
    "portal_languages": {
      "type": "array",
      "items": {
        "required": [],
        "properties": {}
      }
    },
    "help_widget_languages": {
      "type": "array",
      "items": {
        "required": [],
        "properties": {}
      }
    }
  },
  "required": [
    "primary_language",
    "supported_languages",
    "portal_languages",
    "help_widget_languages"
  ],
  "title": "Settings"
};
