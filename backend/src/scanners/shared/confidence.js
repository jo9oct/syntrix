const CONFIDENCE = Object.freeze({
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
});

const calculateConfidence = ({
  confirmed = false,
  repeated = false,
  differential = false,
}) => {
  if (confirmed && repeated) {
    return CONFIDENCE.HIGH;
  }

  if (confirmed || differential || repeated) {
    return CONFIDENCE.MEDIUM;
  }

  return CONFIDENCE.LOW;
};

export { CONFIDENCE, calculateConfidence };
