function removeGlobalFlag(flags: string): string {
  return flags.replace(/g/g, "");
}

function ensureGlobalFlag(flags: string): string {
  return flags.includes("g") ? flags : `${flags}g`;
}

export function buildRegex(pattern: string, flags: string = ""): RegExp {
  return new RegExp(pattern, flags);
}

export function buildGlobalRegex(pattern: string, flags: string = ""): RegExp {
  const safeFlags = removeGlobalFlag(flags);
  return new RegExp(pattern, ensureGlobalFlag(safeFlags));
}

export function buildFullMatchRegex(
  pattern: string,
  flags: string = ""
): RegExp {
  const safeFlags = removeGlobalFlag(flags);
  return new RegExp(`^(?:${pattern})$`, safeFlags);
}

export function toGlobalRegex(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, ensureGlobalFlag(pattern.flags));
}

export function toFullMatchRegex(pattern: RegExp): RegExp {
  const safeFlags = removeGlobalFlag(pattern.flags);
  return new RegExp(`^(?:${pattern.source})$`, safeFlags);
}
