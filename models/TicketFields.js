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
      "label",
      "description",
      "position",
      "required_for_closure",
      "required_for_agents",
      "type",
      "default",
      "customers_can_edit",
      "customers_can_filter",
      "label_for_customers",
      "required_for_customers",
      "displayed_to_customers",
      "created_at",
      "updated_at",
      "portal_cc",
      "portal_cc_to"
    ],
    "properties": {
      "id": {
        "type": "number"
      },
      "name": {
        "type": "string",
        "minLength": 1
      },
      "label": {
        "type": "string",
        "minLength": 1
      },
      "description": {
        "type": "string",
        "minLength": 1
      },
      "position": {
        "type": "number"
      },
      "required_for_closure": {
        "type": "boolean"
      },
      "required_for_agents": {
        "type": "boolean"
      },
      "type": {
        "type": "string",
        "minLength": 1
      },
      "default": {
        "type": "boolean"
      },
      "customers_can_edit": {
        "type": "boolean"
      },
      "customers_can_filter": {
        "type": "boolean"
      },
      "label_for_customers": {
        "type": "string",
        "minLength": 1
      },
      "required_for_customers": {
        "type": "boolean"
      },
      "displayed_to_customers": {
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
      "portal_cc": {
        "type": "boolean"
      },
      "portal_cc_to": {
        "type": "string",
        "minLength": 1
      }
    }
  },
  "title": "TicketFields"
};
