# Free Email with FormSubmit.co Integration

This module implements a free email integration using [FormSubmit.co](https://formsubmit.co), which allows users to create contact forms without server-side code or a backend email service.

## Implementation Details

### 1. Database Schema

We've added a `free_email` table to store:
- User email address
- FormSubmit alias
- Plunk API key (for automated responses)
- WeChat Push API key (for notifications)
- Setup status flags

### 2. Multi-Step Form Process

The setup follows these steps:

1. **Email Step**: User enters their email address, which FormSubmit will use to send a confirmation email
2. **Alias Step**: After confirming via email, FormSubmit provides an alias which the user enters
3. **Plunk API Step**: User enters their Plunk API key for handling automated responses
4. **WeChat Push Step**: User enters their WeChat Push API key for notifications

### 3. State Management

- Form state is preserved in Redis between steps
- If a user exits the process, they can continue from their last completed step
- Once all steps are completed, data is saved to the database

### 4. Testing & Integration

- Test dialog provides a live form to test submissions
- Embeddable code snippet for website integration
- FormSubmit handles all email delivery

## How It Works

When a visitor submits a form on the user's website:

1. FormSubmit.co receives the submission and sends the data to the configured email
2. If configured, our webhook receives a copy of the submission
3. Plunk handles automated responses
4. WeChat Push sends notifications to the user's device

## Usage

To create a new email configuration:

1. Click "Add Email Configuration" button
2. Complete all steps of the multi-step form
3. Use the generated HTML code in your website

## Testing

To test a configuration:
1. Open an existing email configuration card
2. Click the test icon
3. Fill out the test form or copy the embed code for testing on another site

## Implementation Notes

- FormSubmit.co has no direct API, so confirmation and alias processes are manual
- Email address and alias have unique constraints in the database
- Form state persistence ensures users can complete setup across multiple sessions 