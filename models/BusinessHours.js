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
      "is_default",
      "description",
      "business_hours",
      "time_zone",
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
      "is_default": {
        "type": "boolean"
      },
      "description": {
        "type": "string",
        "minLength": 1
      },
      "business_hours": {
        "type": "object",
        "properties": {
          "monday": {
            "type": "object",
            "properties": {
              "start_time": {
                "type": "string",
                "minLength": 1
              },
              "end_time": {
                "type": "string",
                "minLength": 1
              }
            },
            "required": [
              "start_time",
              "end_time"
            ]
          },
          "tuesday": {
            "type": "object",
            "properties": {
              "start_time": {
                "type": "string",
                "minLength": 1
              },
              "end_time": {
                "type": "string",
                "minLength": 1
              }
            },
            "required": [
              "start_time",
              "end_time"
            ]
          },
          "wednesday": {
            "type": "object",
            "properties": {
              "start_time": {
                "type": "string",
                "minLength": 1
              },
              "end_time": {
                "type": "string",
                "minLength": 1
              }
            },
            "required": [
              "start_time",
              "end_time"
            ]
          },
          "thursday": {
            "type": "object",
            "properties": {
              "start_time": {
                "type": "string",
                "minLength": 1
              },
              "end_time": {
                "type": "string",
                "minLength": 1
              }
            },
            "required": [
              "start_time",
              "end_time"
            ]
          },
          "friday": {
            "type": "object",
            "properties": {
              "start_time": {
                "type": "string",
                "minLength": 1
              },
              "end_time": {
                "type": "string",
                "minLength": 1
              }
            },
            "required": [
              "start_time",
              "end_time"
            ]
          }
        },
        "required": [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday"
        ]
      },
      "time_zone": {
        "type": "string",
        "minLength": 1
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
  "title": "BusinessHours"
};
