const buildEmailMessage = ({
  recipient,
  subject,
  text,
  html = null
}) => {
  if (!recipient) {
    throw new Error(
      "Email recipient is required."
    );
  }

  if (!subject) {
    throw new Error(
      "Email subject is required."
    );
  }

  if (!text) {
    throw new Error(
      "Email text is required."
    );
  }

  return {
    to: recipient,
    subject,
    text,
    html
  };
};

const sendEmail = async ({
  recipient,
  subject,
  text,
  html = null
}) => {
  const message =
    buildEmailMessage({
      recipient,
      subject,
      text,
      html
    });

  /*
   * External email delivery is intentionally
   * abstracted from the notification service.
   *
   * The application does not silently claim that
   * an email was delivered when no provider exists.
   */
  return {
    status: "prepared",
    provider: null,
    message
  };
};

export {
  buildEmailMessage,
  sendEmail
};