const findReflection = (
  body,
  marker,
) => {
  if (
    typeof body !== 'string' ||
    typeof marker !== 'string' ||
    marker.length === 0
  ) {
    return null;
  }

  const index = body.indexOf(marker);

  if (index === -1) {
    return null;
  }

  const start = Math.max(0, index - 150);
  const end = Math.min(
    body.length,
    index + marker.length + 150,
  );

  return {
    index,
    context: body.slice(start, end),
  };
};

export {
  findReflection,
};