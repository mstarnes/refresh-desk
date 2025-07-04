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
      "to_email",
      "reply_email",
      "primary_role",
      "active",
      "created_at",
      "updated_at"
    ],
    "properties": {
      "id": {
        "type": "number"
      },
      "name": {
        "type": "string",
        "minLength": 1
      },
      "product_id": {},
      "to_email": {
        "type": "string",
        "minLength": 1
      },
      "reply_email": {
        "type": "string",
        "minLength": 1
      },
      "group_id": {},
      "primary_role": {
        "type": "boolean"
      },
      "active": {
        "type": "boolean"
      },
      "created_at": {
        "type": "string",
        "minLength": 1
      },
      "updated_at": {
        "type": "string",
        "minLength": 1
      }
    }
  },
  "title": "EmailConfigs"
};
