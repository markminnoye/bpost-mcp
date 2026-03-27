> **When to use this file:** Use this file when you need to understand the overall success/failure status of a bpost e-MassPost request action, or when interpreting the severity of messages in a response file.

# Status Codes and Message Severity

## Status Codes

The Response file describes for each action in the Request file the status of that action. The following table gives an overview of the possible status codes:

| Status Code | Description |
|-------------|-------------|
| 100 | The action was successful |
| 998 | The action failed because the system detected at least one fatal error in the Header or Context tag. In this case, all the actions within the request file will have status 998. |
| 999 | The action failed because the system encountered at least one fatal error while processing the action. |

> **Note:** This table of status codes may evolve over time. At all times, an up-to-date status code table can be downloaded on the e-MassPost website http://www.bpost.be/emasspost, in the tab "Informations" of the menu "Files".

## Message Severity

The system reports errors and other information about a Request file within the Replies tag in the response file. Each message has a severity and a message code.

| Severity | Meaning |
|----------|---------|
| FATAL | Fatal error. The system encountered an error that caused it to stop processing the action. |
| ERROR | Non-fatal error. The system encountered a non-fatal error. The action could still be processed. |
| WARN | Warning. |
| INFO | The system reports information. |

## How Status Codes and Message Severity Relate

- If an action tag within the response file contains **no FATAL messages**, the action was processed successfully and will have **status code 100**.
- Whenever an action triggers at least one message with severity **FATAL**, the status code will be **998 or 999**:
  - **998** is used when the fatal error is in the Header or Context tag (affects all actions in the file).
  - **999** is used when the fatal error occurred while processing that specific action.
