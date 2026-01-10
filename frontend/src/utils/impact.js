export const normalizeImpact = (payload, fallbackId = "") => {
  if (!payload) return null;

  const steps = Array.isArray(payload.steps)
    ? payload.steps
    : Object.entries(payload.steps || {}).map(([order, step]) => ({
        ...step,
        order: Number(order)
      }));

  const normalized = {
    id: payload.id || fallbackId,
    title: payload.title || "Impact",
    description: payload.description || payload.descreption || "",
    steps: steps
      .map((step) => ({
        id: step.id,
        order: step.order,
        title: step.title,
        description: step.description || step.descreption || "",
        icon: step.icon
      }))
      .sort((a, b) => (a.order || 0) - (b.order || 0))
  };

  return normalized;
};
