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
      "active",
      "sla_target",
      "applicable_to",
      "is_default",
      "position",
      "created_at",
      "updated_at",
      "escalation"
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
      "active": {
        "type": "boolean"
      },
      "sla_target": {
        "type": "object",
        "properties": {
          "priority_4": {
            "type": "object",
            "properties": {
              "respond_within": {
                "type": "number"
              },
              "resolve_within": {
                "type": "number"
              },
              "business_hours": {
                "type": "boolean"
              },
              "escalation_enabled": {
                "type": "boolean"
              }
            },
            "required": [
              "respond_within",
              "resolve_within",
              "business_hours",
              "escalation_enabled"
            ]
          },
          "priority_3": {
            "type": "object",
            "properties": {
              "respond_within": {
                "type": "number"
              },
              "resolve_within": {
                "type": "number"
              },
              "business_hours": {
                "type": "boolean"
              },
              "escalation_enabled": {
                "type": "boolean"
              }
            },
            "required": [
              "respond_within",
              "resolve_within",
              "business_hours",
              "escalation_enabled"
            ]
          },
          "priority_2": {
            "type": "object",
            "properties": {
              "respond_within": {
                "type": "number"
              },
              "resolve_within": {
                "type": "number"
              },
              "business_hours": {
                "type": "boolean"
              },
              "escalation_enabled": {
                "type": "boolean"
              }
            },
            "required": [
              "respond_within",
              "resolve_within",
              "business_hours",
              "escalation_enabled"
            ]
          },
          "priority_1": {
            "type": "object",
            "properties": {
              "respond_within": {
                "type": "number"
              },
              "resolve_within": {
                "type": "number"
              },
              "business_hours": {
                "type": "boolean"
              },
              "escalation_enabled": {
                "type": "boolean"
              }
            },
            "required": [
              "respond_within",
              "resolve_within",
              "business_hours",
              "escalation_enabled"
            ]
          }
        },
        "required": [
          "priority_4",
          "priority_3",
          "priority_2",
          "priority_1"
        ]
      },
      "applicable_to": {
        "type": "object",
        "properties": {},
        "required": []
      },
      "is_default": {
        "type": "boolean"
      },
      "position": {
        "type": "number"
      },
      "created_at": {
        "type": "string",
        "minLength": 1
      },
      "updated_at": {
        "type": "string",
        "minLength": 1
      },
      "escalation": {
        "type": "object",
        "properties": {},
        "required": []
      }
    }
  },
  "title": "SLAPolicies"
};
