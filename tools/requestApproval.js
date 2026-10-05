export function requestApproval(args) {
  const { action, reason, details } = args;

  return {
    approved: false,
    status: "pending",
    action,
    reason,
    details,
    message: "Human approval is required before this action can be executed.",
  };
}
