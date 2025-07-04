module.exports = {
  "type": "array",
  "$schema": "http://json-schema.org/draft-04/schema#",
  "description": "",
  "minItems": 1,
  "uniqueItems": true,
  "items": {
    "type": "object",
    "required": [
      "id",
      "name",
      "description",
      "default",
      "created_at",
      "updated_at",
      "agent_type"
    ],
    "properties": {
      "id": {
        "type": "number"
      },
      "name": {
        "type": "string",
        "minLength": 1
      },
      "description": {
        "type": "string",
        "minLength": 1
      },
      "default": {
        "type": "boolean"
      },
      "created_at": {
        "type": "string",
        "minLength": 1
      },
      "updated_at": {
        "type": "string",
        "minLength": 1
      },
      "agent_type": {
        "type": "number"
      }
    }
  },
  "title": "Roles"
};
